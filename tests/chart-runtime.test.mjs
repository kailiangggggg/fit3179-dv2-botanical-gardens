import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  adaptChartSpec,
  localizeDataUrls,
  resolveChartSpecUrl,
} from "../src/chart-runtime.js";

const v01Spec = JSON.parse(
  readFileSync(new URL("../public/specs/V01-facility-symbol-map.json", import.meta.url), "utf8"),
);
const facilityPoints = JSON.parse(
  readFileSync(new URL("../public/data/facility_points.geojson", import.meta.url), "utf8"),
).features;
const manifest = JSON.parse(
  readFileSync(new URL("../public/specs/chart-manifest.json", import.meta.url), "utf8"),
);
const v01 = manifest.charts.find(({ id }) => id === "V01");
const sydneySpec = JSON.parse(
  readFileSync(new URL("../public/specs/V01-sydney-detail-map.json", import.meta.url), "utf8"),
);
const melbourneSpec = JSON.parse(
  readFileSync(new URL("../public/specs/V01-melbourne-detail-map.json", import.meta.url), "utf8"),
);
const quantitativeSpec = JSON.parse(
  readFileSync(new URL("../public/specs/V01-under100-area-beeswarm.json", import.meta.url), "utf8"),
);

test("chart specifications resolve relative to a project-page URL", () => {
  const url = resolveChartSpecUrl(
    "specs/V10-avsb-origin-hexbin.json",
    "https://example.github.io/botanical-story/",
  );
  assert.equal(
    url.href,
    "https://example.github.io/botanical-story/specs/V10-avsb-origin-hexbin.json",
  );
});

test("local data URLs are resolved at every nested chart layer", () => {
  const spec = {
    data: { url: "../data/one.csv" },
    layer: [{ data: { url: "../data/two.geojson" } }],
    vconcat: [{ data: { url: "../data/three.csv" } }],
  };
  localizeDataUrls(spec, new URL("https://example.github.io/story/specs/V05.json"));
  assert.deepEqual(
    [spec.data.url, spec.layer[0].data.url, spec.vconcat[0].data.url],
    [
      "https://example.github.io/story/data/one.csv",
      "https://example.github.io/story/data/two.geojson",
      "https://example.github.io/story/data/three.csv",
    ],
  );
});

test("compact layouts reduce V04 ticks and treemap labels without mutating source specs", () => {
  const boxplot = {
    width: 700,
    encoding: {
      x: { axis: { values: [0.5, 1, 5, 10, 50, 100, 500, 1000, 5000] } },
      y: { axis: { labelFontSize: 13 } },
    },
  };
  const compactBoxplot = adaptChartSpec(boxplot, "V04", 340);
  assert.equal(compactBoxplot.width, 320);
  assert.equal(compactBoxplot.padding.left, 20);
  assert.equal(compactBoxplot.padding.right, 0);
  assert.deepEqual(compactBoxplot.encoding.x.axis.values, [0.5, 5, 50, 500, 5000]);
  assert.equal(compactBoxplot.encoding.y.axis.labelFontSize, 11);
  assert.equal(boxplot.encoding.x.axis.values.length, 9);
  assert.equal(boxplot.encoding.y.axis.labelFontSize, 13);

  const wideBoxplot = adaptChartSpec(boxplot, "V04", 700);
  assert.equal(wideBoxplot.width, 680);
  assert.equal(wideBoxplot.padding.left, 20);
  assert.equal(wideBoxplot.encoding.y.axis.labelFontSize, 13);

  const treemap = {
    width: 700,
    layer: [
      {
        mark: { type: "text" },
        encoding: { text: { field: "genus" } },
        transform: [{ filter: "datum.level === 'genus' && datum.x1 - datum.x0 > 125" }],
      },
      {
        mark: { type: "text" },
        encoding: { text: { field: "family_header" } },
        transform: [{ filter: "datum.level === 'family' && datum.x1 - datum.x0 > 210" }],
      },
    ],
  };
  const compactTreemap = adaptChartSpec(treemap, "V06", 340);
  assert.match(compactTreemap.layer[0].transform[0].filter, /datum.level === 'genus'.*> 218/);
  assert.match(compactTreemap.layer[1].transform[0].filter, /datum.level === 'family'.*> 427/);
  assert.match(treemap.layer[0].transform[0].filter, /> 125/);
  assert.match(treemap.layer[1].transform[0].filter, /> 210/);
});

test("V01 keeps its national map and declares three supporting views inside one chart group", () => {
  assert.equal(v01Spec.layer[1].mark.type, "circle");
  assert.deepEqual(v01Spec.layer[1].encoding.size.scale.range, [12, 24, 48, 96]);
  assert.deepEqual(v01.support_views.regional.maps.map(({ id }) => id), ["V01-SYD", "V01-MELB"]);
  assert.equal(v01.support_views.quantitative.id, "V01-AREA");
  assert.equal(manifest.charts.length, 13);
  assert.equal(manifest.rubric_chart_count, 13);
  assert.equal(manifest.map_count, 3);
  assert.equal(manifest.advanced_idiom_types.length, 8);
  assert.equal(v01.data_files.includes("data/facility_points.geojson"), true);
});

test("V01 adapts the map panels and keeps every under-100-ha point collision-free", () => {
  const expectedRegions = [
    { spec: sydneySpec, id: "V01-SYD", bounds: [150.6, 151.4, -34.2, -33.5], expectedCount: 14 },
    { spec: melbourneSpec, id: "V01-MELB", bounds: [144.55, 145.4, -38.25, -37.55], expectedCount: 18 },
  ];
  for (const { spec, bounds, expectedCount } of expectedRegions) {
    const [west, east, south, north] = bounds;
    const sites = facilityPoints.filter((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      return lon >= west && lon <= east && lat >= south && lat <= north;
    });
    assert.equal(sites.length, expectedCount);
    const adaptedMap = adaptChartSpec(spec, "V01-REGION", 440);
    assert.equal(adaptedMap.width, 440);
    assert.equal(adaptedMap.projection.type, "mercator");
    assert.ok(adaptedMap.height >= 160 && adaptedMap.height <= 230);
  }

  const sourceById = new Map(facilityPoints.map((feature) => [feature.properties.globalid, feature.properties.area_hectares]));
  for (const viewportWidth of [266, 328, 674, 899, 1114]) {
    const quantitative = adaptChartSpec(quantitativeSpec, "V01-AREA", viewportWidth, facilityPoints);
    assert.equal(quantitative.data.values.length, 165);
    assert.ok(quantitative.data.values.every((point) => point.area >= 0 && point.area < 100));
    assert.equal(new Set(quantitative.data.values.map(({ id }) => id)).size, 165);
    for (const point of quantitative.data.values) {
      assert.equal(point.area, sourceById.get(point.id), "x position must use the original hectares value");
    }

    const pointDiameter = Math.sqrt(quantitative.mark.size);
    const minimumDistance = pointDiameter + 1;
    const plotted = quantitative.data.values.map((point) => ({
      x: point.area / 100 * quantitative.width,
      y: quantitative.height - point.displayY,
    }));
    for (let first = 0; first < plotted.length; first += 1) {
      for (let second = first + 1; second < plotted.length; second += 1) {
        assert.ok(
          Math.hypot(plotted[first].x - plotted[second].x, plotted[first].y - plotted[second].y) >= minimumDistance - 0.01,
          `V01 points overlap at ${viewportWidth}px`,
        );
      }
    }
  }
});
