import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../public/specs/chart-manifest.json", import.meta.url), "utf8"));
const v01 = manifest.charts.find(({ id }) => id === "V01");
const spec = JSON.parse(readFileSync(new URL("../public/specs/V01-facility-symbol-map.json", import.meta.url), "utf8"));
const renderer = readFileSync(new URL("../src/content-renderer.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/site.css", import.meta.url), "utf8");

test("V01 declares the two neutral A/B locator relationships inside the existing chart group", () => {
  const views = v01.support_views.regional.maps;
  assert.deepEqual(views.map(({ locator }) => [locator?.id, locator?.label]), [
    ["A", "A — Sydney"],
    ["B", "B — Melbourne"],
  ]);
  assert.deepEqual(views.map(({ title }) => title), [
    "A — Sydney area · 14 sites",
    "B — Melbourne area · 18 sites",
  ]);
  assert.match(v01.support_views.regional.description, /A and B locate.*window centres.*Insets enlarge.*repeat 32 sites already in the 182-site national total.*markers show points, not full extents/i);
  assert.equal(manifest.rubric_chart_count, 13);
  assert.equal(manifest.visible_panels, 17);
  assert.equal(manifest.map_count, 3);
  assert.equal(manifest.advanced_idiom_types.length, 8);
});

test("regional headings use the same neutral A/B badge as the national locator", () => {
  assert.match(renderer, /element\("span", "v01-locator-badge", view\.locator\.id\)/);
  assert.match(styles, /\.v01-locator-badge\s*\{[^}]*border:\s*1px solid #34443a/s);
  assert.match(styles, /\.v01-locator-badge\s*\{[^}]*background:\s*#fffdf7/s);
  assert.doesNotMatch(styles, /\.v01-locator-badge\s*\{[^}]*#003F5C|\.v01-locator-badge\s*\{[^}]*#B85C00/s);
});

test("the national map uses centre anchors instead of unreadable extents and keeps labels after facilities", () => {
  const locatorData = "../data/v01_detail_locator_geometry.geojson";
  const layers = spec.layer;
  const layersForKind = (kind) => layers.filter((layer) =>
    layer.data?.url === locatorData && layer.transform?.some(({ filter }) => filter === `datum.properties.kind === '${kind}'`),
  );
  const extent = layersForKind("extent");
  const anchor = layersForKind("anchor");
  const leader = layersForKind("leader");
  const labelLayers = layersForKind("label");
  const facilities = layers.find((layer) => layer.data?.url === "../data/facility_points.geojson");
  const badge = anchor.find((layer) => layer.mark?.type === "point");
  const code = anchor.find((layer) => layer.encoding?.text?.field === "properties.locator_id");
  const place = labelLayers.find((layer) => layer.encoding?.text?.field === "properties.place_label");

  assert.equal(spec.projection.type, "equalEarth");
  assert.equal(extent.length, 0);
  assert.equal(anchor.length, 2);
  assert.equal(leader.length, 1);
  assert.equal(labelLayers.length, 1);
  assert.equal(leader[0].mark.type, "geoshape");
  assert.equal(badge.mark.shape, "square");
  assert.equal(badge.encoding.color.value, "#fffdf7");
  assert.equal(badge.mark.fillOpacity, 0, "the anchor badge must not hide the facility point beneath it");
  assert.equal(anchor[0].mark.type, "point");
  assert.equal(code.mark.type, "text");
  assert.equal(place.mark.type, "text");
  assert.deepEqual(place.mark.align, { expr: "datum.properties.label_align" });
  assert.deepEqual(place.mark.dx, { expr: "datum.properties.label_align === 'left' ? 7 : -7" });
  assert.equal(spec.layer.indexOf(anchor[0]) > spec.layer.indexOf(facilities), true);
  assert.equal(spec.layer.indexOf(anchor[1]) > spec.layer.indexOf(facilities), true);
  assert.equal(spec.layer.indexOf(leader[0]) < spec.layer.indexOf(facilities), true);
  assert.equal(spec.layer.indexOf(badge) > spec.layer.indexOf(facilities), true);
  assert.equal(spec.layer.indexOf(code) > spec.layer.indexOf(facilities), true);
  assert.equal(spec.layer.indexOf(place) > spec.layer.indexOf(facilities), true);
  assert.equal(spec.layer.length, 6);
  assert.equal(v01.data_files.includes("data/v01_detail_locator_geometry.geojson"), true);
});
