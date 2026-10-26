import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { pageStory, chartCards } from "../src/site-content.js";
import viteConfig from "../vite.config.js";

test("pageStory keeps one unchanged jurisdiction list", () => {
  const source = readFileSync(new URL("../src/site-content.js", import.meta.url), "utf8");
  assert.equal((source.match(/^\s{2}jurisdictions\s*:/gm) ?? []).length, 1);
  assert.deepEqual(pageStory.jurisdictions, [
    "New South Wales",
    "Victoria",
    "Queensland",
    "Western Australia",
    "South Australia",
    "Australian Capital Territory",
    "Northern Territory",
    "Tasmania",
  ]);
});

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

test("the approved hero break and chapter labels stay intentional", () => {
  assert.deepEqual(pageStory.hero.titleLines, ["Beyond the", "Garden Gate"]);
  assert.deepEqual(
    pageStory.navigation.map(({ label }) => label),
    [
      "A national footprint",
      "Inside the collections",
      "Beyond the garden gate",
      "What the evidence means",
    ],
  );
  assert.deepEqual(
    pageStory.navigation.map(({ label }) => label),
    pageStory.sections.map(({ title }) => title),
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

test("every chart group appears once in the story", () => {
  const storyChartIds = pageStory.sections.flatMap(({ chartIds }) => chartIds);
  assert.deepEqual(storyChartIds, chartCards.map(({ id }) => id));
  assert.equal(chartCards.length, 13);
  assert.equal(chartCards.filter(({ is_map }) => is_map).length, 3);
  assert.equal(new Set(storyChartIds).size, 13);
});

test("every chart has a concise visible finding or transition in reading order", () => {
  let transitionCount = 0;
  for (const section of pageStory.sections.filter(({ chartIds }) => chartIds.length > 1)) {
    assert.deepEqual(section.chartTransitions.map(({ afterChart }) => afterChart), section.chartIds, `${section.id} chart takeaway order`);
    for (const { afterChart: chartId, text: copy } of section.chartTransitions) {
      assert.ok(copy.trim().length > 0, `${chartId} transition has copy`);
      const maxLength = chartId === "V06" ? 340 : 230;
      assert.ok(copy.length <= maxLength, `${chartId} transition stays concise`);
      transitionCount += 1;
    }
  }
  assert.equal(transitionCount, 13);
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
  assert.match(pageStory.hero.limitation, /not every institution|current holdings|species recovery|education outcomes/i);
  assert.doesNotMatch(pageStory.subtitle, /protect plant diversity/i);
  const records = pageStory.sections.find(({ id }) => id === "records");
  assert.match(chartCards.find(({ id }) => id === "V05").annotation, /taxon IDs are database labels, not verified species/i);
  assert.match(records.chartTransitions.find(({ afterChart }) => afterChart === "V05").text, /not total holdings.*verified species richness/i);
  assert.match(records.intro, /A plant family groups genera|A seed-bank accession is a catalogued seed collection/i);
  assert.match(pageStory.sections.find(({ id }) => id === "evidence").transition, /known facilities.*seed origins.*not its full reach or results/i);
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
  assert.match(css, /\.section-rail\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0/s);
  assert.match(css, /\.section-rail nav\s*\{[^}]*min-width:\s*0/s);
  assert.match(css, /\.section-rail ol\s*\{[^}]*display:\s*grid/s);
  assert.match(css, /\.chart-stack\s*\{[^}]*max-width:\s*1160px/s);
  const tabletRules = css.slice(css.indexOf("@media (max-width: 900px)"), css.indexOf("@media (max-width: 640px)"));
  assert.match(tabletRules, /\.section-rail ol\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(tabletRules, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
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
