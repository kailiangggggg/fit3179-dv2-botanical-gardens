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
    encoding: { x: { axis: { values: [0.5, 1, 5, 10, 50, 100, 500, 1000, 5000] } } },
  };
  const compactBoxplot = adaptChartSpec(boxplot, "V04", 340);
  assert.equal(compactBoxplot.width, 340);
  assert.deepEqual(compactBoxplot.encoding.x.axis.values, [0.5, 5, 50, 500, 5000]);
  assert.equal(boxplot.encoding.x.axis.values.length, 9);

  const treemap = {
    width: 700,
    layer: [{
      mark: { type: "text" },
      transform: [{ filter: "datum.x1 - datum.x0 > 85 && datum.y1 - datum.y0 > 34" }],
    }],
  };
  const compactTreemap = adaptChartSpec(treemap, "V06", 340);
  assert.match(compactTreemap.layer[0].transform[0].filter, /> 177/);
  assert.match(treemap.layer[0].transform[0].filter, /> 85/);
});
