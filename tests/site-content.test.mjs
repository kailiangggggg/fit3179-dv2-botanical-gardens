import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { pageStory } from "../src/site-content.js";
import viteConfig from "../vite.config.js";

const manifest = JSON.parse(
  readFileSync(new URL("../public/specs/chart-manifest.json", import.meta.url), "utf8"),
);

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

test("every manifest chart group appears once in the story", () => {
  const storyChartIds = pageStory.sections.flatMap(({ chartIds }) => chartIds);
  assert.deepEqual(storyChartIds, manifest.charts.map(({ id }) => id));
  assert.equal(manifest.rubric_chart_count, 13);
  assert.equal(manifest.visible_panels, 17);
});

test("V01 narrative distinguishes smoothed site density from registered hectares", () => {
  const footprint = pageStory.sections.find(({ id }) => id === "footprint");
  const v01 = manifest.charts.find(({ id }) => id === "V01");
  assert.match(footprint.intro, /Three states contain 135 of the 182 known-register sites/i);
  assert.match(footprint.intro, /50 km Gaussian contours/i);
  assert.match(footprint.intro, /Each contour line connects places with the same estimated site concentration/i);
  assert.match(footprint.intro, /all 182 coordinates contribute/i);
  assert.match(footprint.intro, /hollow circles mark the 31 facilities/i);
  assert.match(footprint.intro, /not land area or actual botanical coverage/i);
  assert.match(v01.how.channels, /hollow point marks identify only the 31 facilities/i);
  assert.match(v01.how.channels, /registered hectares on the same log scale in both regions/i);
  assert.match(v01.how.marks, /same estimated site concentration/i);
  assert.equal(v01.idiom, "Spatial density contour map");
  assert.match(v01.how.annotation, /31 hollow circles.*below 0\.1.*not a facility type/i);
  assert.match(v01.how.annotation, /not land area or botanical coverage/i);
  assert.ok(v01.how.annotation.length <= 160, "the visible V01 caption stays concise");
});
test("V01 links two regional profiles, the 165-site linear view, and V04 full range", () => {
  const footprint = pageStory.sections.find(({ id }) => id === "footprint");
  const v01 = manifest.charts.find(({ id }) => id === "V01");
  const transition = footprint.chartTransitions.find(({ afterChart }) => afterChart === "V01").text;
  assert.match(footprint.intro, /Sydney and Melbourne profiles link S\/M identifiers/i);
  assert.match(footprint.intro, /linear view compares 165 facilities below 100 ha/i);
  assert.match(transition, /S\/M IDs link 32 sites to hectares on a shared log scale/i);
  assert.match(transition, /All 182 coordinates feed contours/i);
  assert.match(transition, /165 sites fall below 100 ha/i);
  assert.match(transition, /V04 shows full range/i);
  assert.equal(v01.support_views.regional.maps.length, 2);
  assert.equal(v01.support_views.regional.profile_data_file, "data/v01_regional_profiles.geojson");
  assert.equal(v01.support_views.regional.density, undefined);
  assert.equal(v01.support_views.quantitative.subset, "0 <= area_hectares < 100");
  assert.equal(manifest.rubric_chart_count, 13);
  assert.equal(manifest.map_count, 3);
  assert.equal(manifest.visible_panels, 17);
});
test("V01 keeps A/B geographic window references and matches S/M site IDs to area profiles", () => {
  const footprint = pageStory.sections.find(({ id }) => id === "footprint");
  const v01 = manifest.charts.find(({ id }) => id === "V01");
  const transition = footprint.chartTransitions.find(({ afterChart }) => afterChart === "V01").text;
  assert.deepEqual(v01.support_views.regional.maps.map(({ title }) => title), [
    "A — Sydney area · 14 sites",
    "B — Melbourne area · 18 sites",
  ]);
  assert.match(transition, /A\/B locate Sydney and Melbourne/i);
  assert.match(v01.support_views.regional.description, /S01–S14 and M01–M18.*match the complete facility lists/i);
  assert.match(v01.support_views.regional.description, /base-10 logarithmic scale from 0\.5 to 1,000 ha.*tenfold change/i);
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
