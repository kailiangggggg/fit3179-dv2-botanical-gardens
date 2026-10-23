import assert from "node:assert/strict";
import { test } from "node:test";
import { pageStory, chartCards } from "../src/site-content.js";

const charts = new Map(chartCards.map((chart) => [chart.id, chart]));
const section = (id) => pageStory.sections.find((item) => item.id === id);
const transition = (sectionId, chartId) => section(sectionId).chartTransitions
  .find((item) => item.afterChart === chartId)?.text ?? "";

test("the hero introduces the botanical network and states what the evidence cannot measure", () => {
  assert.match(pageStory.hero.lede, /gardens and arboreta/i);
  assert.match(pageStory.hero.lede, /living.*preserved.*seed/i);
  assert.match(pageStory.hero.limitation, /complete|not every/i);
  assert.match(pageStory.hero.limitation, /conservation|education|access/i);
});

test("the first chapter separates raw counts, population rates, ranks and footprints", () => {
  assert.deepEqual(section("footprint").chartIds, ["V01", "V02", "V03", "V04"]);
  assert.match(charts.get("V01").title, /135 of 182/i);

  assert.match(section("footprint").intro, /circle area/i);
  assert.match(transition("footprint", "V01"), /raw.*jurisdiction counts/i);
  assert.match(transition("footprint", "V02"), /population/i);
  assert.match(transition("footprint", "V03"), /ACT.*sixth.*first/i);
  assert.match(charts.get("V04").title, /3,739(?:-hectare| ha)/i);
  assert.match(charts.get("V04").annotation, /logarithmic axis/i);
});

test("the collections chapter defines distinct record types and limits", () => {
  assert.match(section("records").intro, /accession/i);
  assert.match(section("records").intro, /LIVING_SPECIMEN/i);
  assert.match(section("records").intro, /PRESERVED_SPECIMEN/i);
  assert.match(section("records").intro, /not.*total|cannot be added/i);
  assert.match(transition("records", "V05"), /58,562.*119,278.*child/i);
  assert.match(transition("records", "V06"), /3,240.*1,897.*surviv/i);
  assert.match(transition("records", "V07"), /4,321.*not.*accession date/i);
  assert.match(transition("records", "V08"), /preserved.*no usable years/i);
  assert.match(charts.get("V08").annotation, /20,647.*PRESERVED_SPECIMEN.*4,800/i);
  assert.match(transition("records", "V09"), /1,843.*not.*conservation/i);
});

test("the origins chapter links maps to coordinate and date coverage", () => {
  assert.match(section("origins").intro, /origins|collected/i);
  assert.match(section("origins").intro, /not.*garden|not.*storage/i);
  assert.match(transition("origins", "V10"), /38,773.*38,099.*674.*suppressed/i);
  assert.match(transition("origins", "V11"), /10,949.*33,765.*four/i);
  assert.match(charts.get("V12").title, /0%.*100%/i);
  assert.match(transition("origins", "V12"), /2,921.*12,871.*22\.7%.*geographic representativeness/i);
  assert.match(transition("origins", "V13"), /four.*no usable.*not uninterrupted/i);
});

test("the conclusion connects documented work to education and conservation without claiming outcomes", () => {
  const evidence = section("evidence");
  const text = [evidence.intro, ...evidence.paragraphs, evidence.transition].join(" ");
  assert.match(text, /living collections/i);
  assert.match(text, /herbari|preserved specimens/i);
  assert.match(text, /seed/i);
  assert.match(text, /education|learning programs/i);
  assert.match(text, /45 of 49/i);
  assert.match(text, /not.*national|not.*outcome|do not measure/i);
  assert.doesNotMatch(text, /proves? (?:conservation|education|recovery)/i);
});

test("all thirteen chart groups have concise evidence-led titles and visible caveats", () => {
  assert.equal(chartCards.length, 13);
  for (const chart of chartCards) {
    assert.ok(chart.title.trim().length > 0);
    assert.ok(chart.annotation.trim().length > 0);
    assert.ok(chart.annotation.length <= 240, chart.id + " annotation is too long");
  }
  assert.match(charts.get("V08").annotation, /4,800/);
  assert.match(charts.get("V10").title, /38,099/);
  assert.match(charts.get("V12").title, /0%.*100%/);
  assert.match(charts.get("V13").title, /Four of ten/i);
});
