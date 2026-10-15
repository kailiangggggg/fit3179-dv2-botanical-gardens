import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const kingsPark = JSON.parse(
  readFileSync(new URL("../public/specs/V08-kingspark-family-records.json", import.meta.url), "utf8"),
);
const facilitiesMap = JSON.parse(
  readFileSync(new URL("../public/specs/V02-facilities-per-million-choropleth.json", import.meta.url), "utf8"),
);
const rankChart = JSON.parse(
  readFileSync(new URL("../public/specs/V03-count-rate-slopegraph.json", import.meta.url), "utf8"),
);
const symbolMap = JSON.parse(
  readFileSync(new URL("../public/specs/V01-facility-symbol-map.json", import.meta.url), "utf8"),
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
const manifest = JSON.parse(
  readFileSync(new URL("../public/specs/chart-manifest.json", import.meta.url), "utf8"),
);

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

test("V08 uses a readable thousand-record axis with the exact range", () => {
  assert.deepEqual(kingsPark.encoding.x.axis.values, [0, 1000, 2000, 3000, 4000, 5000, 6000]);
  assert.match(kingsPark.encoding.x.axis.labelExpr, /datum\.value/);
});

test("V02 and V03 share a state-focus signal and V01 highlights hovered facilities", () => {
  assert.equal(facilitiesMap.params?.[0]?.name, "linkedState");
  assert.equal(rankChart.params?.[0]?.name, "linkedState");
  assert.match(facilitiesMap.layer[1].encoding.opacity.condition.test, /linkedState/);
  assert.match(rankChart.encoding.opacity.condition.test, /linkedState/);
  assert.equal(symbolMap.layer[1].params?.[0]?.select?.on, "pointerover");
  assert.ok(symbolMap.layer[1].encoding.opacity.condition);
});

test("V02 projection keeps the choropleth inside a compact Australia-focused frame", () => {
  assert.equal(facilitiesMap.height, 430);
  assert.equal(facilitiesMap.projection.scale.signal, "min(615, width * 1.55)");
  assert.equal(facilitiesMap.projection.translate.signal, "[width / 2, 206]");
});

test("V01 labels proportional-symbol area and V02 separates rate colour from count greens", () => {
  const size = symbolMap.layer[1].encoding.size;
  assert.equal(size.title, "Registered area (ha)");
  assert.equal(size.legend.title, "Registered area (ha)");
  assert.deepEqual(size.legend.values, [1, 100, 1000, 3739]);
  assert.equal(facilitiesMap.layer[1].encoding.color.scale.scheme, "blues");
});

test("V03 binds its state legend to a filter selection", () => {
  const legendSelection = rankChart.params?.find((param) => param.name === "stateLegend");
  assert.equal(legendSelection?.bind, "legend");
  assert.equal(legendSelection?.select?.toggle, true);
  assert.ok(rankChart.transform.some((transform) => transform.filter?.param === "stateLegend"));
});

test("V03 repeats jurisdiction identity with endpoint shape for grayscale reading", () => {
  const shape = rankChart.encoding.shape;
  assert.equal(shape.field, "state");
  assert.equal(shape.legend.title, "State / territory");
  assert.equal(shape.scale.domain.length, 8);
  assert.equal(shape.scale.range.length, 8);
  assert.equal(rankChart.encoding.color.legend.title, "State / territory");
});

test("V03 jurisdiction colors stay distinct under CVD simulation and visible on paper", () => {
  const palette = rankChart.encoding.color.scale.range;
  assert.equal(palette.length, 8);
  for (const color of palette) {
    const luminance = relativeLuminance(color);
    const paperLuminance = relativeLuminance("#fffdf7");
    assert.ok((paperLuminance + 0.05) / (luminance + 0.05) >= 3, `${color} lacks line contrast on paper`);
  }
  assert.ok(minimumCvdSeparation(palette) >= 8, `palette separation dropped to ${minimumCvdSeparation(palette).toFixed(1)}`);
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

test("the chart manifest explains hover and linked-jurisdiction interactions", () => {
  const chartById = new Map(manifest.charts.map((chart) => [chart.id, chart]));
  assert.match(chartById.get("V01").how.interaction, /hover highlights/i);
  assert.match(chartById.get("V02").how.interaction, /linked.*V03/i);
  assert.match(chartById.get("V03").how.interaction, /linked.*V02/i);
  assert.match(chartById.get("V03").how.interaction, /click legend.*focus/i);
  assert.match(chartById.get("V03").how.interaction, /Enter or Space/i);
  assert.match(chartById.get("V03").how.interaction, /All jurisdictions to clear/i);
});

test("V08 identifies Myrtaceae as the largest named family, excluding the pooled remainder", () => {
  const kingsParkChart = manifest.charts.find((chart) => chart.id === "V08");
  assert.equal(kingsParkChart.title, "Myrtaceae is the largest named Kings Park family");
  assert.match(kingsParkChart.how.ordering, /Other families is the final pooled row/i);
});

test("chart annotations are reader-facing and explain the log axis and taxon IDs", () => {
  for (const chart of manifest.charts) {
    assert.doesNotMatch(chart.how.annotation, /^(explain|add|show|tell the reader)\b/i, `${chart.id} annotation is an author instruction`);
  }
  const resourceChart = manifest.charts.find((chart) => chart.id === "V05");
  assert.match(resourceChart.how.annotation, /taxon IDs are database labels/i);
  assert.match(resourceChart.how.annotation, /not verified species counts/i);
});
