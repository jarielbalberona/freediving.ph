import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";

import { cn } from "@/lib/utils";
import { safeMarkdownUrl } from "../lib/markdown";

const markdownSchema = {
  ...defaultSchema,
  tagNames: defaultSchema.tagNames?.filter((tag) => tag !== "img"),
};

type ChikaMarkdownProps = {
  content: string;
  className?: string;
};

export function ChikaMarkdown({ content, className }: ChikaMarkdownProps) {
  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed text-foreground/90",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        rehypePlugins={[[rehypeSanitize, markdownSchema]]}
        skipHtml
        urlTransform={safeMarkdownUrl}
        components={{
          a: ({ href, children }) => {
            const safeHref = safeMarkdownUrl(href ?? "");
            if (!safeHref) {
              return <span>{children}</span>;
            }
            return (
              <a
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                {children}
              </a>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-xl font-semibold leading-tight text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold leading-tight text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold leading-tight text-foreground">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold leading-tight text-foreground">
              {children}
            </h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.startsWith("language-");
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                {children}
              </code>
            );
          },
          img: () => null,
          hr: () => <hr className="border-border" />,
          em: ({ children }) => <em className="italic">{children}</em>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          ol: ({ children }) => (
            <ol className="ml-5 list-decimal space-y-1">{children}</ol>
          ),
          p: ({ children }) => <p>{children}</p>,
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md bg-muted p-3">
              {children}
            </pre>
          ),
          ul: ({ children }) => (
            <ul className="ml-5 list-disc space-y-1">{children}</ul>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
