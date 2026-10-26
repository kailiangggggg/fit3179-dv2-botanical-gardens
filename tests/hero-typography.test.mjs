import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("the desktop hero title is capped at 80 px while keeping its responsive minimum", () => {
  const css = readFileSync(new URL("../src/site.css", import.meta.url), "utf8");
  const heading = css.match(/^h1\s*\{([^}]+)\}/m)?.[1];
  assert.ok(heading, "the main hero heading must have an explicit CSS rule");
  assert.match(heading, /font-size:\s*clamp\(54px,\s*7\.1vw,\s*80px\)/);
  assert.match(heading, /font-family:\s*var\(--serif\)/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
});
