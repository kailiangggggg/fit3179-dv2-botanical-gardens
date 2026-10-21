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

test("every manifest chart group appears once in the story", () => {
  const storyChartIds = pageStory.sections.flatMap(({ chartIds }) => chartIds);
  assert.deepEqual(storyChartIds, manifest.charts.map(({ id }) => id));
  assert.equal(manifest.rubric_chart_count, 13);
  assert.equal(manifest.visible_panels, 17);
});

test("V01 narrative distinguishes graduated size classes from reported hectares", () => {
  const footprint = pageStory.sections.find(({ id }) => id === "footprint");
  const v01 = manifest.charts.find(({ id }) => id === "V01");
  assert.match(footprint.intro, /Three states contain 135 of the 182 known-register sites/i);
  assert.match(footprint.intro, /Arboreta are gardens focused on trees and woody plants/i);
  assert.match(footprint.intro, /graduated circles group registered areas, with exact hectares available on hover/i);
  assert.doesNotMatch(footprint.intro, /circle area shows reported land footprint/i);
  assert.equal(v01.idiom, "Graduated-symbol map");
  assert.match(v01.how.channels, /circle area values 12\/24\/48\/96 for the four registered-area classes/i);
  assert.match(v01.how.channels, /legend gives hectare boundaries/i);
});

test("V01 visibly distinguishes repeated regional views, the 0–100 ha comparison, and V04's full range", () => {
  const footprint = pageStory.sections.find(({ id }) => id === "footprint");
  const v01 = manifest.charts.find(({ id }) => id === "V01");
  const transition = footprint.chartTransitions.find(({ afterChart }) => afterChart === "V01").text;
  assert.match(footprint.intro, /Sydney and Melbourne detail views repeat/i);
  assert.match(footprint.intro, /linear.*165.*(?:under|below) 100 ha/i);
  assert.match(transition, /Sydney.*Melbourne.*repeat/i);
  assert.match(transition, /linear.*165.*within-class/i);
  assert.match(transition, /V04.*full range/i);
  assert.equal(v01.support_views.regional.maps.length, 2);
  assert.equal(v01.support_views.quantitative.subset, "0 <= area_hectares < 100");
  assert.equal(manifest.rubric_chart_count, 13);
  assert.equal(manifest.map_count, 3);
  assert.equal(manifest.visible_panels, 17);
});

test("V01 uses matching A/B labels to connect the national map with repeated detail views", () => {
  const footprint = pageStory.sections.find(({ id }) => id === "footprint");
  const v01 = manifest.charts.find(({ id }) => id === "V01");
  assert.deepEqual(v01.support_views.regional.maps.map(({ title }) => title), [
    "A — Sydney area · 14 sites",
    "B — Melbourne area · 18 sites",
  ]);
  assert.match(footprint.intro, /A — Sydney.*B — Melbourne/i);
  assert.match(v01.support_views.regional.description, /A and B locate.*window centres.*Insets enlarge.*repeat 32 sites already in the 182-site national total.*markers show points, not full extents/i);
});

test("every chart has a concise visible finding or transition in reading order", () => {
  let transitionCount = 0;
  for (const section of pageStory.sections.filter(({ chartIds }) => chartIds.length > 1)) {
    assert.deepEqual(section.chartTransitions.map(({ afterChart }) => afterChart), section.chartIds, `${section.id} chart takeaway order`);
    for (const { afterChart: chartId, text: copy } of section.chartTransitions) {
      assert.ok(copy.trim().length > 0, `${chartId} transition has copy`);
      assert.ok(copy.length <= 230, `${chartId} transition stays concise`);
      transitionCount += 1;
    }
  }
  assert.equal(transitionCount, 13);
});

test("visible chart copy answers the archive, origin, and rank-change questions", () => {
  const transition = (sectionId, chartId) => pageStory.sections
    .find(({ id }) => id === sectionId)
    .chartTransitions.find(({ afterChart }) => afterChart === chartId).text;

  assert.match(transition("footprint", "V02"), /population.*smaller jurisdictions.*fewer facilities/i);
  assert.match(transition("footprint", "V03"), /ACT.*sixth.*first.*NT.*second.*not access/i);
  assert.match(transition("records", "V05"), /119,278.*58,562.*linked children.*taxon IDs/i);
  assert.match(transition("records", "V06"), /10,609.*LIVING_SPECIMEN.*10,599.*current survival/i);
  assert.match(transition("records", "V07"), /not necessarily accession dates/i);
  assert.match(transition("records", "V08"), /20,647.*PRESERVED_SPECIMEN.*no usable years/i);
  assert.match(transition("origins", "V10"), /fewer than five.*collection origins.*not gardens/i);
  assert.match(transition("origins", "V12"), /0%.*100%.*22\.7%.*ALA Australian PlantBank archive.*top-level accessions.*map-ready coordinates.*not geographic representativeness/i);
  assert.match(manifest.charts.find(({ id }) => id === "V12").how.annotation, /ALA Australian PlantBank archive.*2,921 of 12,871 top-level accessions \(22\.7%\)/i);
  assert.match(manifest.charts.find(({ id }) => id === "V13").how.annotation, /Four archives lack usable top-level years/i);
  assert.match(transition("origins", "V13"), /year spans.*file endpoints.*not continuous.*facility locations.*collection records/i);
  assert.doesNotMatch(transition("records", "V06"), /1,897/);
  assert.doesNotMatch(transition("origins", "V10"), /38,099/);
  assert.doesNotMatch(transition("origins", "V11"), /33,765/);
  assert.doesNotMatch(transition("origins", "V13"), /33,765/);
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
  assert.match(records.chartTransitions.find(({ afterChart }) => afterChart === "V05").text, /taxon IDs are labels, not verified species counts/i);
  assert.match(records.intro, /A plant family groups genera|A seed-bank accession is a catalogued seed collection/i);
  assert.match(pageStory.sections.find(({ id }) => id === "evidence").transition, /known.*records.*origins|known.*published.*wild origins/i);
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
