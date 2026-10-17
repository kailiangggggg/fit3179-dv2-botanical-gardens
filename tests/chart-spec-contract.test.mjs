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
const facilityPoints = JSON.parse(
  readFileSync(new URL("../public/data/facility_points.geojson", import.meta.url), "utf8"),
);
const facilityBoxplot = JSON.parse(
  readFileSync(new URL("../public/specs/V04-registered-footprint-boxplot.json", import.meta.url), "utf8"),
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
const manifest = JSON.parse(
  readFileSync(new URL("../public/specs/chart-manifest.json", import.meta.url), "utf8"),
);
const siteStyles = readFileSync(new URL("../src/site.css", import.meta.url), "utf8");
const humanChartManifest = readFileSync(new URL("../CHART_MANIFEST.md", import.meta.url), "utf8");
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

test("V08 uses a readable thousand-record axis with the exact range", () => {
  assert.deepEqual(kingsPark.encoding.x.axis.values, [0, 1000, 2000, 3000, 4000, 5000, 6000]);
  assert.match(kingsPark.encoding.x.axis.labelExpr, /datum\.value/);
});

test("V02 and V03 share a state-focus signal and V01 highlights hovered facilities", () => {
  assert.equal(facilitiesMap.params?.[0]?.name, "linkedState");
  assert.equal(rankChart.params?.[0]?.name, "linkedState");
  assert.match(facilitiesMap.layer[1].encoding.opacity.condition.test, /linkedState/);
  assert.match(rankLine.encoding.opacity.condition.test, /linkedState/);
  assert.match(rankEndpointLabels.encoding.opacity.condition.test, /linkedState/);
  assert.equal(symbolMap.layer[1].params?.[0]?.select?.on, "pointerover");
  assert.ok(symbolMap.layer[1].encoding.opacity.condition);
});

test("V02 projection keeps the choropleth inside a compact Australia-focused frame", () => {
  assert.equal(facilitiesMap.height, 430);
  assert.equal(facilitiesMap.projection.scale.signal, "min(615, width * 1.55)");
  assert.equal(facilitiesMap.projection.translate.signal, "[width / 2, 206]");
});

test("V01 classifies each site once and uses an ordered graduated-symbol legend", () => {
  const size = symbolMap.layer[1].encoding.size;
  const classExpression = symbolMap.layer[1].transform?.find(
    (transform) => transform.as === "registered_area_class",
  )?.calculate;
  assert.ok(classExpression, "V01 must calculate explicit registered-area classes");
  assert.equal(
    classExpression,
    "datum.properties.area_hectares < 10 ? '0–<10 ha' : datum.properties.area_hectares < 100 ? '10–<100 ha' : datum.properties.area_hectares < 1000 ? '100–<1,000 ha' : '≥1,000 ha'",
  );
  const classify = (areaHectares) => {
    if (areaHectares < 10) return "0–<10 ha";
    if (areaHectares < 100) return "10–<100 ha";
    if (areaHectares < 1000) return "100–<1,000 ha";
    return "≥1,000 ha";
  };
  const classLabels = ["0–<10 ha", "10–<100 ha", "100–<1,000 ha", "≥1,000 ha"];
  const classCounts = new Map(classLabels.map((label) => [label, 0]));

  for (const feature of facilityPoints.features) {
    const areaClass = classify(feature.properties.area_hectares);
    assert.ok(classCounts.has(areaClass), `Unexpected class for ${feature.properties.feature_name}`);
    classCounts.set(areaClass, classCounts.get(areaClass) + 1);
  }

  assert.deepEqual([...classCounts], [
    ["0–<10 ha", 81],
    ["10–<100 ha", 84],
    ["100–<1,000 ha", 16],
    ["≥1,000 ha", 1],
  ]);
  assert.equal(facilityPoints.features.length, 182);
  assert.deepEqual(
    [9.999, 10, 99.999, 100, 999.999, 1000].map(classify),
    ["0–<10 ha", "10–<100 ha", "10–<100 ha", "100–<1,000 ha", "100–<1,000 ha", "≥1,000 ha"],
  );

  assert.equal(symbolMap.layer.length, 2, "V01 should not cover its size-coded circles with a locator overlay");
  assert.match(siteStyles, /#chart-mount-V01\s+\.layer_0_marks\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(siteStyles, /#chart-mount-V01\s+\.background\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(siteStyles, /#chart-mount-V01\s+\.layer_1_marks\s+path\s*\{[^}]*pointer-events:\s*all\s*!important/s);
  assert.equal(symbolMap.layer[1].mark.type, "circle");
  assert.equal(symbolMap.layer[1].encoding.shape, undefined, "facility type must not be duplicated by shape");
  assert.equal(size.field, "registered_area_class");
  assert.equal(size.type, "nominal");
  assert.equal(size.title, "Registered area class");
  assert.deepEqual(size.scale.domain, classLabels);
  assert.deepEqual(size.scale.range, [6, 18, 54, 162]);
  assert.deepEqual(size.legend.values, classLabels);
  assert.equal(size.legend.title, "Registered area class");

  const areaTooltip = symbolMap.layer[1].encoding.tooltip.find(
    (entry) => entry.field === "properties.area_hectares",
  );
  assert.equal(areaTooltip.format, ",.1f", "tooltip should preserve the reported hectares");
  assert.match(symbolMap.description, /graduated|classes/i);
  assert.doesNotMatch(symbolMap.description, /area is proportional/i);
  assert.match(humanChartManifest, /\|\s*V01\s*\|[^\n]*\|\s*Graduated-symbol map\s*\|/);
  assert.match(humanChartManifest, /four graduated circle sizes encode registered-area classes/i);
  assert.doesNotMatch(humanChartManifest, /Proportional-symbol map/i);
  assert.equal(facilitiesMap.layer[1].encoding.color.scale.scheme, "blues");
});

test("V01 and V04 use the approved CVD-screened facility-type colours", () => {
  const mapColors = symbolMap.layer[1].encoding.color.scale.range;
  const boxplotColors = facilityBoxplot.encoding.color.scale.range;
  assert.deepEqual(mapColors, ["#003F5C", "#B85C00"]);
  assert.deepEqual(boxplotColors, mapColors);
  assert.ok(minimumCvdSeparation(mapColors) >= 70);
  for (const color of mapColors) {
    assert.ok(contrastRatio(color, "#f1efe7") >= 3, `${color} lacks symbol contrast on the map land`);
  }
});

test("V02 state labels switch polarity to preserve text contrast on dark rate fills", () => {
  const labels = facilitiesMap.layer[2];
  assert.equal(labels.mark.fontSize, 12);
  assert.equal(labels.encoding.color.condition.test, "datum.properties.facilities_per_million >= 10");
  assert.equal(labels.encoding.color.condition.value.toLowerCase(), "#fffdf7");
  assert.equal(labels.encoding.color.value.toLowerCase(), "#16372e");
  assert.equal(labels.encoding.stroke.condition.value.toLowerCase(), "#16372e");
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
