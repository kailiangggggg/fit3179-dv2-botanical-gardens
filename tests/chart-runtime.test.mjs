import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adaptChartSpec,
  localizeDataUrls,
  resolveChartSpecUrl,
} from "../src/chart-runtime.js";

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
