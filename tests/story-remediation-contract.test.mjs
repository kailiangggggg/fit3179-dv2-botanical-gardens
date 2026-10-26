import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assert.match(charts.get("V05").annotation, /58,562.*119,278.*child rows are excluded/i);
  assert.match(transition("records", "V06"), /3,240.*1,897.*surviv/i);
  assert.match(transition("records", "V07"), /4,321.*not.*accession date/i);
  assert.match(transition("records", "V08"), /preserved.*no usable years/i);
  assert.match(charts.get("V08").annotation, /20,647.*PRESERVED_SPECIMEN.*4,800/i);
  assert.match(transition("records", "V09"), /1,843.*not.*conservation/i);
});

test("the origins chapter links maps to coordinate and date coverage", () => {
  assert.match(section("origins").intro, /origins|collected/i);
  assert.match(section("origins").intro, /not.*garden|not.*storage/i);
  assert.match(transition("origins", "V10"), /Perth.*southeastern Australia.*Canberra.*Snowy Mountains.*Blue Mountains.*Illawarra/i);
  assert.doesNotMatch(transition("origins", "V10"), /eastern NSW/i);
  assert.match(transition("origins", "V10"), /9,677.*38,099.*25\.4%/);
  assert.match(charts.get("V10").annotation, /674 of 38,773 map-ready records.*logarithmic/i);
  assert.match(transition("origins", "V11"), /10,949.*33,765.*four/i);
  assert.match(charts.get("V12").title, /0%.*100%/i);
  assert.match(transition("origins", "V12"), /2,921.*12,871.*22\.7%.*sample may not cover every region/i);
  assert.match(transition("origins", "V13"), /four.*no usable.*don't show every collecting event/i);
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

test("V09 caption separates the all-family decade total from Myrtaceae", () => {
  const csv = readFileSync(new URL("../public/data/plantbank_family_decades.csv", import.meta.url), "utf8").trim();
  const rows = csv.split(/\r?\n/).slice(1).map((line) => line.split(","));
  const recordCount = (row) => Number(row[4]);
  const allRecords = rows.reduce((sum, row) => sum + recordCount(row), 0);
  const allFamily1980s = rows.filter((row) => row[2] === "1980").reduce((sum, row) => sum + recordCount(row), 0);
  const myrtaceae1980s = rows.filter((row) => row[0] === "Myrtaceae" && row[2] === "1980").reduce((sum, row) => sum + recordCount(row), 0);
  const annotation = charts.get("V09").annotation;

  assert.equal(allRecords, 9683);
  assert.equal(allFamily1980s, 4320);
  assert.equal(myrtaceae1980s, 1843);
  assert.match(annotation, /1980s.*4,320.*all families.*1,843.*Myrtaceae/i);
  assert.match(annotation, /archive distribution, not conservation activity/i);
  assert.doesNotMatch(annotation, /1,843 of the 9,683 rows/i);
});

test("visible chart notes decode V04 and V10 and describe V13 omissions accurately", () => {
  const v04 = charts.get("V04");
  assert.match(v04.channels, /hue distinguishes Botanic Gardens from Arboreta/i);
  assert.doesNotMatch(v04.channels, /map.?s type colors/i);
  assert.match(v04.annotation, /center line.*median.*box.*middle half.*whiskers.*usual range.*dots.*outliers/i);

  assert.match(charts.get("V09").annotation, /zero means no indexed record.*family.*decade.*not missing data/i);
  assert.match(charts.get("V10").annotation, /logarithmic/i);

  const v13 = charts.get("V13");
  assert.match(v13.annotation, /Australian PlantBank.*WA Seed Centre \(Kensington\).*Alice Springs Desert Park.*Greening Australia/i);
  assert.match(v13.annotation, /Australian PlantBank here is the ALA resource, not V07.*GBIF PlantBank Records dataset/i);
  assert.match(v13.measure, /year ranges are shown for the six ALA resources with usable dates/i);
  assert.match(v13.measure, /four undated resources are named in the caption/i);
  const v13Spec = JSON.parse(readFileSync(new URL("../public/specs/V13-avsb-date-coverage.json", import.meta.url), "utf8"));
  assert.doesNotMatch(v13Spec.description, /named in the accompanying caption/i);
  assert.match(v13Spec.description, /Four undated resources are named in the caption/i);
  assert.match(v13Spec.description, /ALA Australian PlantBank.*GBIF PlantBank Records dataset in V07/i);
});

test("V05 explains the two archive leaders without equating IDs with holdings or richness", () => {
  const csv = readFileSync(new URL("../public/data/ala_resource_profile.csv", import.meta.url), "utf8").trim();
  const [headerLine, ...lines] = csv.split(/\r?\n/);
  const headers = headerLine.split(",");
  const rows = lines.map((line) => Object.fromEntries(headers.map((header, index) => [header, line.split(",")[index]])));
  const accessionLeader = rows.reduce((best, row) => Number(row.root_accessions) > Number(best.root_accessions) ? row : best);
  const taxonLeader = rows.reduce((best, row) => Number(row.distinct_taxon_ids) > Number(best.distinct_taxon_ids) ? row : best);

  assert.equal(accessionLeader.resource_name, "National Seed Bank");
  assert.equal(Number(accessionLeader.root_accessions), 16323);
  assert.equal(taxonLeader.resource_name, "Australian PlantBank");
  assert.equal(Number(taxonLeader.distinct_taxon_ids), 4743);
  assert.match(transition("records", "V05"), /National Seed Bank.*16,323.*Australian PlantBank.*4,743/i);
  assert.match(transition("records", "V05"), /not total holdings.*verified species richness/i);
});

test("V10’s geographic takeaway follows the five highest-count 100 km cells", () => {
  const geojson = JSON.parse(readFileSync(new URL("../public/data/ala_origin_hexes.geojson", import.meta.url), "utf8"));
  const total = geojson.features.reduce((sum, feature) => sum + Number(feature.properties.record_count), 0);
  const topFive = geojson.features
    .slice()
    .sort((left, right) => Number(right.properties.record_count) - Number(left.properties.record_count))
    .slice(0, 5);
  const topFiveTotal = topFive.reduce((sum, feature) => sum + Number(feature.properties.record_count), 0);
  const centers = topFive.map((feature) => {
    const ring = feature.geometry.coordinates[0];
    const vertices = ring.slice(0, -1);
    const mean = (coordinate) => vertices.reduce((sum, point) => sum + point[coordinate], 0) / vertices.length;
    return [Number(mean(0).toFixed(2)), Number(mean(1).toFixed(2))];
  });

  assert.equal(total, 38099);
  assert.equal(topFiveTotal, 9677);
  assert.equal(Number((topFiveTotal / total * 100).toFixed(1)), 25.4);
  const expectedCenters = [
    [116.21, -32.09],
    [149.19, -35.35],
    [148.53, -36.55],
    [150.60, -33.68],
    [150.74, -34.42],
  ];
  centers.forEach((center, index) => {
    assert.ok(Math.abs(center[0] - expectedCenters[index][0]) < 0.01, `top cell ${index + 1} longitude is approximate`);
    assert.ok(Math.abs(center[1] - expectedCenters[index][1]) < 0.01, `top cell ${index + 1} latitude is approximate`);
  });
  assert.match(transition("origins", "V10"), /Perth.*Canberra.*Snowy Mountains.*Blue Mountains.*Illawarra/i);
  assert.match(transition("origins", "V10"), /9,677.*38,099.*25\.4%/);
});

test("V13 names the four undated ALA resources and separates ALA PlantBank from V07’s GBIF dataset", () => {
  const csv = readFileSync(new URL("../public/data/ala_date_coverage.csv", import.meta.url), "utf8").trim();
  const [headerLine, ...lines] = csv.split(/\r?\n/);
  const headers = headerLine.split(",");
  const rows = lines.map((line) => Object.fromEntries(headers.map((header, index) => [header, line.split(",")[index]])));
  const undated = rows.filter((row) => Number(row.dated_accessions) === 0).map((row) => row.resource_name).sort();
  const annotation = charts.get("V13").annotation;

  assert.deepEqual(undated, [
    "Alice Springs Desert Park",
    "Australian PlantBank",
    "Greening Australia",
    "WA Seed Centre (Kensington)",
  ]);
  for (const name of undated) assert.ok(annotation.includes(name), `V13 caption must name ${name}`);
  assert.match(annotation, /ALA.*V07.*GBIF.*PlantBank/i);
});
