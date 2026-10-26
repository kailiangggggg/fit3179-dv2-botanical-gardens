import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compile } from "vega-lite";
import { chartCards } from "../src/site-content.js";

const kingsPark = JSON.parse(
  readFileSync(new URL("../public/specs/V08-kingspark-family-records.json", import.meta.url), "utf8"),
);
const facilitiesMap = JSON.parse(
  readFileSync(new URL("../public/specs/V02-facilities-per-million-choropleth.json", import.meta.url), "utf8"),
);
const rankChart = JSON.parse(
  readFileSync(new URL("../public/specs/V03-count-rate-slopegraph.json", import.meta.url), "utf8"),
);
const stateRankComparison = readFileSync(
  new URL("../public/data/state_rank_comparison.csv", import.meta.url),
  "utf8",
);
const plantbankHeatmap = JSON.parse(
  readFileSync(new URL("../public/specs/V09-plantbank-family-decade-heatmap.json", import.meta.url), "utf8"),
);
const plantbankHistogram = JSON.parse(
  readFileSync(new URL("../public/specs/V07-plantbank-date-histogram.json", import.meta.url), "utf8"),
);
const accessionHistogram = JSON.parse(
  readFileSync(new URL("../public/specs/V11-avsb-accession-years.json", import.meta.url), "utf8"),
);
const plantbankTreemap = JSON.parse(
  readFileSync(new URL("../public/specs/V06-plantbank-family-treemap.json", import.meta.url), "utf8"),
);
const originHexbin = JSON.parse(
  readFileSync(new URL("../public/specs/V10-avsb-origin-hexbin.json", import.meta.url), "utf8"),
);
const siteStyles = readFileSync(new URL("../src/site.css", import.meta.url), "utf8");
const rankLine = rankChart.layer.find((layer) => layer.mark?.type === "line");
const rankEndpointLabels = rankChart.layer.find((layer) => layer.encoding?.text?.field === "state_abbreviation");

const cvdMatrices = [
  [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
];

function linearChannel(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function rgbFromHex(hex) {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
}

function simulateColorVision(hex, matrix) {
  const channels = rgbFromHex(hex).map(linearChannel);
  return matrix.map((row) => {
    const value = row.reduce((total, coefficient, index) => total + coefficient * channels[index], 0);
    const bounded = Math.max(0, Math.min(1, value));
    return bounded <= 0.0031308 ? 12.92 * bounded : 1.055 * bounded ** (1 / 2.4) - 0.055;
  });
}

function rgbToLab(rgb) {
  const [r, g, b] = rgb.map(linearChannel);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const transform = (value) => value > 0.008856 ? value ** (1 / 3) : 7.787 * value + 16 / 116;
  const [fx, fy, fz] = [x, y, z].map(transform);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function relativeLuminance(hex) {
  const [r, g, b] = rgbFromHex(hex).map(linearChannel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(first, second) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function cssColorToken(name) {
  const match = siteStyles.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(match, `Missing CSS color token ${name}`);
  return match[1];
}

function minimumCvdSeparation(palette) {
  return Math.min(...cvdMatrices.map((matrix) => {
    const colors = palette.map((color) => rgbToLab(simulateColorVision(color, matrix)));
    let minimumDistance = Infinity;
    for (let first = 0; first < colors.length; first += 1) {
      for (let second = first + 1; second < colors.length; second += 1) {
        const distance = Math.hypot(...colors[first].map((value, index) => value - colors[second][index]));
        minimumDistance = Math.min(minimumDistance, distance);
      }
    }
    return minimumDistance;
  }));
}

function pairSeparation(palette, first, second, matrix) {
  const firstLab = matrix
    ? rgbToLab(simulateColorVision(palette[first], matrix))
    : rgbToLab(rgbFromHex(palette[first]));
  const secondLab = matrix
    ? rgbToLab(simulateColorVision(palette[second], matrix))
    : rgbToLab(rgbFromHex(palette[second]));
  return Math.hypot(...firstLab.map((value, index) => value - secondLab[index]));
}

function crossingPairSeparation(palette) {
  const [header, ...lines] = stateRankComparison.trim().split(/\r?\n/);
  const columns = header.split(",");
  const stateIndex = columns.indexOf("state");
  const countIndex = columns.indexOf("facility_count_rank");
  const rateIndex = columns.indexOf("facility_rate_rank");
  const ranks = new Map(lines.map((line) => {
    const values = line.split(",");
    return [values[stateIndex], {
      count: Number(values[countIndex]),
      rate: Number(values[rateIndex]),
    }];
  }));
  const states = rankLine.encoding.color.scale.domain;
  const crossingPairs = [];
  for (let first = 0; first < states.length; first += 1) {
    for (let second = first + 1; second < states.length; second += 1) {
      const a = ranks.get(states[first]);
      const b = ranks.get(states[second]);
      if ((a.count - b.count) * (a.rate - b.rate) < 0) crossingPairs.push([first, second]);
    }
  }
  const matrices = [null, ...cvdMatrices];
  return Math.min(...matrices.flatMap((matrix) =>
    crossingPairs.map(([first, second]) => pairSeparation(palette, first, second, matrix)),
  ));
}

test("V08 uses a readable thousand-record axis with the exact range", () => {
  assert.deepEqual(kingsPark.encoding.x.axis.values, [0, 1000, 2000, 3000, 4000, 5000, 6000]);
  assert.match(kingsPark.encoding.x.axis.labelExpr, /datum\.value/);
});

test("V02 and V03 share state focus while V01 keeps findings visible without hover", () => {
  assert.equal(facilitiesMap.params?.[0]?.name, "linkedState");
  assert.equal(rankChart.params?.[0]?.name, "linkedState");
  assert.match(facilitiesMap.layer[1].encoding.opacity.condition.test, /linkedState/);
  assert.match(rankLine.encoding.opacity.condition.test, /linkedState/);
  assert.match(rankEndpointLabels.encoding.opacity.condition.test, /linkedState/);
  assert.equal(chartCards.find(({ id }) => id === "V01").spec, "specs/V01-facility-symbol-map.json");
  assert.equal(Object.hasOwn(chartCards.find(({ id }) => id === "V01"), "support_views"), false);
});

test("V02 projection keeps the choropleth inside a compact Australia-focused frame", () => {
  assert.equal(facilitiesMap.height, 430);
  assert.equal(facilitiesMap.projection.scale.signal, "min(615, width * 1.55)");
  assert.equal(facilitiesMap.projection.translate.signal, "[width / 2, 206]");
});

test("V02 label colours account for NT's dark fill and ACT's pale label point", () => {
  const labels = facilitiesMap.layer[2];
  assert.equal(labels.mark.fontSize, 12);
  assert.equal(labels.mark.strokeWidth, undefined, "map text should not have a halo");
  assert.equal(labels.encoding.stroke, undefined, "map text should render without an outline");
  assert.equal(labels.encoding.opacity.value, 1, "de-emphasised regions must retain readable labels");
  assert.deepEqual(labels.encoding.color.condition.map(({ test, value }) => [test, value.toLowerCase()]), [
    ["linkedState !== null && datum.properties.state !== linkedState", "#16372e"],
    ["datum.properties.state_abbreviation === 'NT'", "#fffdf7"],
  ]);
  assert.equal(labels.encoding.color.value.toLowerCase(), "#16372e");
});

test("small interface text colors meet AA contrast on paper and chart surfaces", () => {
  for (const token of ["--quiet", "--ochre"]) {
    const color = cssColorToken(token);
    for (const background of [cssColorToken("--paper"), cssColorToken("--surface")]) {
      assert.ok(contrastRatio(color, background) >= 4.5, `${token} fails on ${background}`);
    }
  }
});

test("V03 legend filters share an explicit selection state across lines and endpoint labels", () => {
  const selectedStates = rankChart.params?.find((param) => param.name === "selectedStates");
  const filter = rankChart.transform.find((transform) => typeof transform.filter === "string")?.filter;
  assert.deepEqual(selectedStates?.value, []);
  assert.match(filter, /length\(selectedStates\) === 0/);
  assert.match(filter, /indexof\(selectedStates, datum\.state\) >= 0/);
  assert.equal(rankEndpointLabels.transform[0].filter, "datum.comparison === 'Facilities per million'");
});

test("V03 repeats jurisdiction identity with endpoint shape for grayscale reading", () => {
  const shape = rankLine.encoding.shape;
  assert.equal(shape.field, "state");
  assert.equal(shape.legend.title, "State / territory");
  assert.equal(shape.scale.domain.length, 8);
  assert.equal(shape.scale.range.length, 8);
  assert.equal(rankLine.encoding.color.legend.title, "State / territory");
  assert.equal(rankEndpointLabels.transform[0].filter, "datum.comparison === 'Facilities per million'");
  assert.equal(rankEndpointLabels.encoding.text.field, "state_abbreviation");
  assert.equal(rankEndpointLabels.mark.align, "left");
});

test("V03 jurisdiction colors stay distinct under CVD simulation and visible on paper", () => {
  const palette = rankLine.encoding.color.scale.range;
  assert.equal(palette.length, 8);
  assert.deepEqual(Object.fromEntries(rankLine.encoding.color.scale.domain.map((state, index) => [state, palette[index]])), {
    "New South Wales": "#005A8C",
    Victoria: "#C45100",
    Queensland: "#332288",
    "Western Australia": "#568EAE",
    "South Australia": "#2D8A70",
    "Australian Capital Territory": "#735A32",
    "Northern Territory": "#444444",
    Tasmania: "#5D6D7E",
  });
  for (const color of palette) {
    const luminance = relativeLuminance(color);
    const paperLuminance = relativeLuminance("#fffdf7");
    assert.ok((paperLuminance + 0.05) / (luminance + 0.05) >= 3, `${color} lacks line contrast on paper`);
  }
  assert.ok(minimumCvdSeparation(palette) >= 8, `palette separation dropped to ${minimumCvdSeparation(palette).toFixed(1)}`);
  assert.ok(crossingPairSeparation(palette) >= 18, `crossing-line separation dropped to ${crossingPairSeparation(palette).toFixed(1)}`);
  assert.ok(pairSeparation(palette, 0, 5, null) >= 30, "NSW and ACT need clear normal-vision separation");
  assert.ok(pairSeparation(palette, 1, 4, null) >= 30, "Victoria and South Australia need clear normal-vision separation");
});

test("V06 family colors stay distinguishable for the CVD-screened legend", () => {
  const palette = plantbankTreemap.layer[0].encoding.color.scale.range;
  assert.equal(palette.length, 6);
  assert.ok(minimumCvdSeparation(palette) >= 8, `palette separation dropped to ${minimumCvdSeparation(palette).toFixed(1)}`);
});

test("V07 and V11 encode decades as continuous ten-year histogram intervals", () => {
  for (const spec of [plantbankHistogram, accessionHistogram]) {
    assert.equal(spec.encoding.x.type, "quantitative");
    assert.equal(spec.encoding.x.field, "decade");
    assert.equal(spec.encoding.x2.field, "decade_end");
    assert.equal(spec.encoding.y2.datum, 0);
  }
});

test("V09 shows the full heatmap range and reserves white labels for dark cells", () => {
  const countEncoding = plantbankHeatmap.layer[0].encoding.color;
  const labelColor = plantbankHeatmap.layer[1].encoding.color;
  assert.deepEqual(countEncoding.scale.domain, [0, 2000]);
  assert.deepEqual(countEncoding.legend.values, [0, 500, 1000, 1500, 2000]);
  assert.equal(labelColor.condition.test, "datum.record_count >= 1400");
  assert.equal(labelColor.condition.value.toLowerCase(), "#fffdf7");
});

test("V10 exposes sparse bins with a monotonic sequential range and matching legend ticks", () => {
  const color = originHexbin.layer[1].encoding.color;
  const [low, high] = color.scale.range;
  assert.deepEqual(color.scale.domain, [5, 2629]);
  assert.equal(color.scale.type, "log");
  assert.equal(color.scale.clamp, true);
  assert.deepEqual(color.legend.values, [5, 20, 100, 500, 2629]);
  assert.ok(relativeLuminance(low) > relativeLuminance(high));
  assert.ok(contrastRatio(low, "#f1efe7") >= 3, `${low} is too close to the land background`);
});

test("V01, V02 and V03 retain the linked geographic chart contracts", () => {
  const chartById = new Map(chartCards.map((chart) => [chart.id, chart]));
  assert.equal(chartById.get("V01").spec, "specs/V01-facility-symbol-map.json");
  assert.ok(chartById.get("V01").annotation.length > 0);
  const mainSource = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  assert.match(mainSource, /setLinkedJurisdiction/);
  assert.match(mainSource, /linkedState/);
  assert.match(mainSource, /selectedStates/);
});

test("V08 identifies Myrtaceae as the largest named family, excluding the pooled remainder", () => {
  const kingsParkChart = chartCards.find((chart) => chart.id === "V08");
  assert.equal(kingsParkChart.title, "Myrtaceae is Kings Park’s largest named voucher family");
  assert.equal(kingsPark.encoding.y.sort.field, "family_order_numeric");
});

test("chart annotations are reader-facing and explain the log axis and taxon IDs", () => {
  for (const chart of chartCards) {
    assert.doesNotMatch(chart.annotation, /^(explain|add|show|tell the reader)\b/i, `${chart.id} annotation is an author instruction`);
  }
  const resourceChart = chartCards.find((chart) => chart.id === "V05");
  assert.match(resourceChart.annotation, /taxon IDs are database labels/i);
  assert.match(resourceChart.annotation, /not verified species counts/i);
});

test("V09 parses numeric fields so zero labels and family ordering render correctly", () => {
  const csv = readFileSync(new URL("../public/data/plantbank_family_decades.csv", import.meta.url), "utf8").trim();
  const [header, ...lines] = csv.split(/\r?\n/);
  const countIndex = header.split(",").indexOf("record_count");
  const values = lines.map((line) => line.split(",")[countIndex]);
  assert.equal(values.length, 66);
  assert.equal(values.filter((value) => value === "0").length, 10);
  assert.equal(values.filter((value) => value === "").length, 0);
  assert.deepEqual(plantbankHeatmap.data.format.parse, {
    family_order: "number",
    decade: "number",
    record_count: "number",
  }, "numeric CSV fields must parse as numbers for strict zero filters and numeric sorts");
  const zeroLabels = plantbankHeatmap.layer.find((layer) =>
    layer.mark?.type === "text" && layer.transform?.some(({ filter }) => filter === "datum.record_count === 0"));
  assert.ok(zeroLabels, "every observed zero cell should display a zero label");
  assert.equal(zeroLabels.encoding.text.field, "record_count");
  assert.equal(zeroLabels.mark.fontSize, 10);
});

test("V03 compiled slopegraph displays both measures, rank ticks and fractional ties", () => {
  const compiled = compile(rankChart).spec;
  assert.ok(Array.isArray(compiled.axes), "compiled V03 must contain rendered axes");
  const comparisonAxis = compiled.axes.find((axis) => axis.scale === "x" && axis.orient === "bottom");
  const rankAxis = compiled.axes.find((axis) => axis.scale === "y" && axis.orient === "left" && axis.title);
  assert.ok(comparisonAxis && comparisonAxis.labels !== false, "comparison headings must render on the horizontal axis");
  assert.equal(comparisonAxis?.labelPadding, 16, "horizontal labels need separation from the lowest rank endpoint");
  assert.deepEqual(rankLine.encoding.x.sort, ["Facility count", "Facilities per million"]);
  assert.equal(rankAxis?.title, "Rank (1 = highest)");
  assert.deepEqual(rankAxis?.values, [1, 2, 3, 4, 5, 6, 7, 8]);
  const rankScale = compiled.scales.find((scale) => scale.name === "y");
  assert.deepEqual(rankScale?.domain, [1, 8]);
  assert.equal(rankScale?.reverse, true);
  const [header, ...rows] = stateRankComparison.trim().split(/\r?\n/).map((line) => line.split(","));
  const columns = Object.fromEntries(header.map((name, index) => [name, index]));
  for (const state of ["Northern Territory", "Tasmania"]) {
    const row = rows.find((item) => item[columns.state] === state);
    assert.equal(Number(row[columns.facility_count_rank]), 7.5, "tied states retain their raw-count midrank");
  }
});
