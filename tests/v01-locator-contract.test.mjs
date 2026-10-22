import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { shouldRenderV01SupportViews } from "../src/chart-runtime.js";

const manifest = JSON.parse(readFileSync(new URL("../public/specs/chart-manifest.json", import.meta.url), "utf8"));
const v01 = manifest.charts.find(({ id }) => id === "V01");
const activeSpec = JSON.parse(readFileSync(new URL("../public/specs/V01-facility-symbol-map.json", import.meta.url), "utf8"));
const archivedSpec = JSON.parse(readFileSync(new URL("../public/specs/V01-density-contour-map.json", import.meta.url), "utf8"));

test("V01 keeps one active map group while its former detail views stay out of the default story", () => {
  assert.equal(manifest.charts.length, 13);
  assert.equal(manifest.rubric_chart_count, 13);
  assert.equal(manifest.visible_panels, 14);
  assert.equal(manifest.map_count, 3);
  assert.equal(manifest.advanced_idiom_types.length, 8);
  assert.equal(v01.idiom, "Proportional-symbol map");
  assert.equal(v01.support_views.default_visible, false);
  assert.equal(shouldRenderV01SupportViews(v01), false);
  assert.deepEqual(v01.data_files, [
    "data/state_rates.geojson",
    "data/v01_jurisdiction_counts.geojson",
  ]);
  const activeDataUrls = new Set(activeSpec.layer.map(({ data }) => data?.url).filter(Boolean));
  assert.deepEqual(activeDataUrls, new Set([
    "../data/state_rates.geojson",
    "../data/v01_jurisdiction_counts.geojson",
  ]));
  assert.ok(activeSpec.layer.every((layer) => !layer.data?.url?.includes("v01_detail_locator_geometry")));
});

test("hidden regional and 0–100 ha evidence remains linked in the archived V01 metadata", () => {
  assert.equal(v01.support_views.density.spec, "specs/V01-density-contour-map.json");
  assert.deepEqual(v01.support_views.regional.maps.map(({ id, locator }) => [id, locator.id]), [
    ["V01-SYD", "A"],
    ["V01-MELB", "B"],
  ]);
  assert.match(v01.support_views.regional.description, /S01–S14 and M01–M18.*complete facility lists/i);
  assert.match(v01.support_views.regional.description, /0\.5 to 1,000 ha.*tenfold change/i);
  assert.equal(v01.support_views.quantitative.id, "V01-AREA");
  assert.equal(v01.support_views.quantitative.subset, "0 <= area_hectares < 100");
  assert.equal(v01.support_views.quantitative.spec, "specs/V01-under100-area-beeswarm.json");
  assert.equal(archivedSpec.layer.filter((layer) =>
    layer.data?.url === "../data/v01_detail_locator_geometry.geojson").length, 4);
});
