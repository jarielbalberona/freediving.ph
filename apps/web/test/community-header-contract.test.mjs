import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("community page headers use one-column navigation and title rows", () => {
  const header = read("src/components/community/community-page.tsx");
  assert.match(header, /navigation\?: ReactNode/);
  assert.match(header, /<header className="flex min-w-0 flex-col gap-3">/);
  assert.match(
    header,
    /<div className="flex min-w-0 items-start justify-between gap-3">/,
  );
  assert.match(header, /<p className="max-w-xl text-xs leading-5 text-muted-foreground">/);
  assert.doesNotMatch(header, /eyebrow/);
  assert.doesNotMatch(header, /sm:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.doesNotMatch(header, /border-border\/60 bg-background text-muted-foreground/);
});

test("community pages do not pass old eyebrow labels", () => {
  const pagePaths = [
    "src/app/events/page.tsx",
    "src/app/events/create/page.tsx",
    "src/app/events/[slug]/client-page.tsx",
    "src/app/buddies/page.tsx",
    "src/app/groups/page.tsx",
    "src/app/chika/page.tsx",
  ];

  for (const path of pagePaths) {
    const source = read(path);
    assert.doesNotMatch(source, /eyebrow=/, path);
    assert.doesNotMatch(
      source,
      /grid gap-3 sm:grid-cols-\[minmax\(0,1fr\)_auto\]/,
      path,
    );
  }
});

test("event back buttons use the header navigation row", () => {
  const createPage = read("src/app/events/create/page.tsx");
  const detailPage = read("src/app/events/[slug]/client-page.tsx");

  assert.match(createPage, /navigation=\{<BackToEventsButton \/>}/);
  assert.match(detailPage, /navigation=\{<BackButton \/>}/);
  assert.doesNotMatch(createPage, /action=\{<BackToEventsButton \/>}/);
  assert.doesNotMatch(detailPage, /action=\{<BackButton \/>}/);
});
