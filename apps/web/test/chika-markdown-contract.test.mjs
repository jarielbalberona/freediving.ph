import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";

const repoRoot = path.resolve(globalThis.process.cwd());
const appRoot = repoRoot.endsWith(path.join("apps", "web"))
  ? repoRoot
  : path.join(repoRoot, "apps", "web");

const rendererPath = path.join(
  appRoot,
  "src/features/chika/components/ChikaMarkdown.tsx",
);
const editorPath = path.join(
  appRoot,
  "src/features/chika/components/MarkdownEditor.tsx",
);
const markdownLibPath = path.join(
  appRoot,
  "src/features/chika/lib/markdown.ts",
);
const createPagePath = path.join(appRoot, "src/app/chika/create/page.tsx");
const threadDetailPath = path.join(
  appRoot,
  "src/features/chika/components/ThreadDetail.tsx",
);
const threadListPath = path.join(appRoot, "src/app/chika/threads.tsx");

const testMarkdownSchema = {
  ...defaultSchema,
  tagNames: defaultSchema.tagNames?.filter((tag) => tag !== "img"),
};

const testSafeMarkdownUrl = (value) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("//")) {
    return "";
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) && !/^(?:https?|mailto|tel):/i.test(trimmed)) {
    return "";
  }
  return trimmed;
};

const renderMarkdown = (content) =>
  renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkBreaks],
        rehypePlugins: [[rehypeSanitize, testMarkdownSchema]],
        skipHtml: true,
        urlTransform: testSafeMarkdownUrl,
        components: {
          a: ({ href, children }) => {
            const safeHref = testSafeMarkdownUrl(href ?? "");
            if (!safeHref) {
              return React.createElement("span", null, children);
            }
            return React.createElement(
              "a",
              {
                href: safeHref,
                target: "_blank",
                rel: "noopener noreferrer",
              },
              children,
            );
          },
          img: () => null,
        },
      },
      content,
    ),
  );

test("chika markdown renderer uses safe basic markdown only", async () => {
  const [renderer, markdownLib] = await Promise.all([
    readFile(rendererPath, "utf8"),
    readFile(markdownLibPath, "utf8"),
  ]);

  assert.match(renderer, /ReactMarkdown/);
  assert.match(renderer, /remarkBreaks/);
  assert.match(renderer, /rehypeSanitize/);
  assert.match(renderer, /skipHtml/);
  assert.match(renderer, /tag !== "img"/);
  assert.match(renderer, /img:\s*\(\) => null/);
  assert.match(renderer, /target="_blank"/);
  assert.match(renderer, /rel="noopener noreferrer"/);
  assert.match(renderer, /urlTransform=\{safeMarkdownUrl\}/);
  assert.match(renderer, /const safeHref = safeMarkdownUrl/);

  assert.match(markdownLib, /SAFE_LINK_PROTOCOLS/);
  assert.match(markdownLib, /trimmed\.startsWith\("\/\/"\)/);
  assert.match(markdownLib, /MARKDOWN_IMAGE/);
  assert.match(markdownLib, /stripMarkdownForPreview/);
});

test("chika create and display paths are wired to markdown components", async () => {
  const [editor, createPage, threadDetail, threadList] = await Promise.all([
    readFile(editorPath, "utf8"),
    readFile(createPagePath, "utf8"),
    readFile(threadDetailPath, "utf8"),
    readFile(threadListPath, "utf8"),
  ]);

  assert.match(editor, /TabsTrigger value="write"/);
  assert.match(editor, /TabsTrigger value="preview"/);
  assert.match(editor, /ChikaMarkdown content=\{value\}/);
  assert.match(editor, /Bold/);
  assert.match(editor, /Italic/);
  assert.match(editor, /Link/);
  assert.match(editor, /SquareCode/);
  assert.match(editor, /ListOrdered/);

  assert.match(createPage, /MarkdownEditor/);
  assert.match(threadDetail, /ChikaMarkdown content=\{thread\.content\}/);
  assert.match(threadList, /stripMarkdownForPreview\(thread\.content\)/);
});

test("chika markdown renders safe basics and blocks unsafe output", () => {
  const formatted = renderMarkdown(
    [
      "**bold** and *italic*",
      "",
      "[Freediving](https://freediving.ph)",
      "",
      "- one",
      "- two",
      "",
      "> quote",
      "",
      "`inline`",
      "",
      "```go",
      "fmt.Println(\"depth\")",
      "```",
    ].join("\n"),
  );

  assert.match(formatted, /<strong>bold<\/strong>/);
  assert.match(formatted, /<em>italic<\/em>/);
  assert.match(formatted, /href="https:\/\/freediving\.ph"/);
  assert.match(formatted, /target="_blank"/);
  assert.match(formatted, /rel="noopener noreferrer"/);
  assert.match(formatted, /<ul>/);
  assert.match(formatted, /<blockquote>/);
  assert.match(formatted, /<code>inline<\/code>/);
  assert.match(formatted, /<pre><code/);
  assert.match(formatted, /fmt\.Println/);

  const unsafe = renderMarkdown(
    '<script>alert("x")</script><strong>raw</strong>\n\n![alt](https://example.com/x.png)\n\n[bad](javascript:alert(1))\n\n[protocol relative](//example.com)',
  );

  assert.doesNotMatch(unsafe, /<script/);
  assert.doesNotMatch(unsafe, /<strong>raw<\/strong>/);
  assert.doesNotMatch(unsafe, /<img/);
  assert.doesNotMatch(unsafe, /href="javascript:/);
  assert.doesNotMatch(unsafe, /href="\/\/example\.com"/);
});
