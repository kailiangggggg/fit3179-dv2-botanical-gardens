import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { pageStory } from "../src/site-content.js";
import viteConfig from "../vite.config.js";

const manifest = JSON.parse(
  readFileSync(new URL("../public/specs/chart-manifest.json", import.meta.url), "utf8"),
);

test("the story has four navigable sections, including evidence and sources", () => {
  assert.deepEqual(
    pageStory.sections.map(({ id }) => id),
    ["footprint", "records", "origins", "evidence"],
  );
  assert.deepEqual(
    pageStory.navigation.map(({ href }) => href),
    pageStory.sections.map(({ id }) => `#${id}`),
  );
});

test("the approved hero break and compact rail labels stay intentional", () => {
  assert.deepEqual(pageStory.hero.titleLines, ["Beyond the", "Garden Gate"]);
  assert.deepEqual(
    pageStory.navigation.map(({ label }) => label),
    ["A national footprint", "What records show", "Beyond the gate", "Evidence & sources"],
  );
});

test("the linked state control uses the jurisdictions in V03", () => {
  const rankChart = JSON.parse(
    readFileSync(new URL("../public/specs/V03-count-rate-slopegraph.json", import.meta.url), "utf8"),
  );
  const rankLine = rankChart.layer.find((layer) => layer.mark?.type === "line");
  assert.deepEqual(pageStory.jurisdictions, rankLine.encoding.color.scale.domain);
  const renderer = readFileSync(new URL("../src/content-renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /Press Enter or Space on a legend label/);
  assert.match(renderer, /All jurisdictions to clear the filter/);
});

test("every manifest chart group appears once in the story", () => {
  const storyChartIds = pageStory.sections.flatMap(({ chartIds }) => chartIds);
  assert.deepEqual(storyChartIds, manifest.charts.map(({ id }) => id));
  assert.equal(manifest.rubric_chart_count, 13);
  assert.equal(manifest.visible_panels, 14);
});

test("V01 narrative distinguishes graduated size classes from reported hectares", () => {
  const footprint = pageStory.sections.find(({ id }) => id === "footprint");
  const v01 = manifest.charts.find(({ id }) => id === "V01");
  assert.match(footprint.intro, /four graduated circle sizes show registered-area classes/i);
  assert.match(footprint.intro, /hover to see each facility’s reported hectares/i);
  assert.doesNotMatch(footprint.intro, /circle area shows reported land footprint/i);
  assert.equal(v01.idiom, "Graduated-symbol map");
  assert.match(v01.how.channels, /discrete circle size for registered-area class/i);
  assert.match(v01.how.channels, /explicit hectare boundaries/i);
});

test("each section has reader-facing copy and a transition", () => {
  for (const section of pageStory.sections) {
    assert.ok(section.title.trim(), `${section.id} has a title`);
    assert.ok(section.intro.trim(), `${section.id} has an introduction`);
    assert.ok(section.paragraphs.length > 0, `${section.id} has body copy`);
    assert.ok(section.transition.trim(), `${section.id} has a transition`);
  }
  assert.ok(pageStory.hero.limitation.includes("not"));
});

test("the story avoids conservation-impact claims and defines unfamiliar record terms", () => {
  assert.match(pageStory.subtitle, /Mapping Australia’s gardens/i);
  assert.match(pageStory.hero.limitation, /do not measure plant survival, species recovery or educational outcomes/i);
  assert.doesNotMatch(pageStory.subtitle, /protect plant diversity/i);
  const records = pageStory.sections.find(({ id }) => id === "records");
  assert.match(records.paragraphs[0], /taxon IDs—database labels, not verified species counts/i);
  assert.match(records.paragraphs[1], /A plant family groups genera/i);
});

test("the page shell has a skip link, main landmark, and local module entry", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<a[^>]+href="#main-content"[^>]*>Skip to story<\/a>/);
  assert.match(html, /<main[^>]+id="main-content"/);
  assert.match(html, /<script[^>]+src="\.\/src\/main\.js"/);
});

test("the site styling supports mobile and reduced-motion preferences", () => {
  const css = readFileSync(new URL("../src/site.css", import.meta.url), "utf8");
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /\.section-rail,\s*\.section-rail nav\s*\{[^}]*min-width:\s*0/s);
  const mobileRules = css.slice(css.indexOf("@media (max-width: 640px)"), css.indexOf("@media (max-width: 360px)"));
  assert.match(mobileRules, /\.section-rail ol\s*\{[^}]*display:\s*grid/s);
  assert.match(mobileRules, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

test("source disclosures identify licences and link all ten ALA collections", () => {
  assert.ok(pageStory.sources.every(({ label, publisher, url, license }) =>
    label && publisher && /^https:\/\//.test(url) && license,
  ));
  assert.equal(pageStory.sources.filter(({ category }) => category === "ALA").length, 10);
  assert.ok(pageStory.sources.some(({ publisher, license }) =>
    publisher.includes("BGANZ") && license.includes("report cited for aggregate context only"),
  ));
});

test("ASGS Edition 4 source points to the current ABS boundary page", () => {
  const source = pageStory.sources.find(({ label }) => label === "ASGS Edition 4 digital boundaries");
  assert.equal(
    source?.url,
    "https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs/edition-4-july-2026-june-2031/access-and-downloads/digital-boundary-files",
  );
});

test("the site build cannot empty the project documentation directory", () => {
  assert.equal(viteConfig.build.outDir, "site-dist");
  assert.equal(viteConfig.build.emptyOutDir, true);
});
