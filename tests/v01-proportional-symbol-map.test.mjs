import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { pageStory, chartCards } from "../src/site-content.js";

const publicUrl = new URL("../public/", import.meta.url);
const v01 = chartCards.find(({ id }) => id === "V01");

function readPublicJson(path) {
  return JSON.parse(readFileSync(new URL(path, publicUrl), "utf8"));
}

function insideRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    const crosses = (yi > y) !== (yj > y)
      && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function insideGeometry(point, geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) =>
    insideRing(point, polygon[0]) && !polygon.slice(1).some((hole) => insideRing(point, hole)));
}

test("V01 uses one proportional-symbol map group for raw jurisdiction counts", () => {
  assert.equal(v01.idiom, "Proportional-symbol map");
  assert.equal(v01.is_map, true);
  assert.equal(v01.spec, "specs/V01-facility-symbol-map.json");
  assert.equal(Object.hasOwn(v01, "support_views"), false);
  assert.deepEqual(v01.data_files, [
    "data/state_rates.geojson",
    "data/v01_jurisdiction_counts.geojson",
  ]);
  assert.equal(chartCards.length, 13);
  assert.equal(chartCards.filter(({ is_map }) => is_map).length, 3);
});

test("V01 maps count with circle area and leaves subtype unencoded", () => {
  const spec = readPublicJson(v01.spec);
  assert.equal(spec.projection.type, "equalEarth");
  const stateLayer = spec.layer.find((layer) => layer.mark?.type === "geoshape");
  assert.ok(stateLayer.transform.some(({ filter }) => filter === "datum.properties.state_code !== '9'"));
  const symbolLayer = spec.layer.find((layer) =>
    layer.mark?.type === "circle" && layer.encoding?.size?.field === "properties.facility_count");
  assert.ok(symbolLayer, "jurisdiction count has one circle symbol per row");
  assert.deepEqual(symbolLayer.encoding.size.scale.domain, [0, 50]);
  assert.deepEqual(symbolLayer.encoding.size.scale.range, [0, 2000]);
  assert.equal(symbolLayer.encoding.size.scale.zero, true);
  assert.deepEqual(symbolLayer.encoding.size.legend.values, [10, 25, 50]);
  assert.equal(symbolLayer.encoding.color, undefined, "color does not repeat subtype or encode a second value");
  assert.equal(symbolLayer.encoding.shape, undefined);
  assert.ok(symbolLayer.encoding.tooltip.some(({ field }) => field === "properties.facility_count"));
  const labels = spec.layer.filter((layer) => layer.encoding?.text?.field === "properties.label");
  assert.equal(labels.length, 2, "every count gets one outside abbreviation-and-count label");
  assert.deepEqual(new Set(labels.map((layer) => layer.mark.align)), new Set(["left", "right"]));
  for (const layer of labels) {
    assert.equal(layer.mark.type, "text");
    assert.equal(layer.mark.fontSize, 12);
    assert.equal(layer.mark.color, "#202a27");
    assert.equal(layer.encoding.longitude.field, "label_longitude_adjusted");
    assert.equal(layer.encoding.latitude.field, "label_latitude_adjusted");
    assert.ok(layer.transform.some(({ filter }) => filter), "left and right labels have explicit jurisdiction groups");
  }
  assert.ok(labels.find((layer) => layer.mark.align === "left").transform.some(({ calculate, as }) =>
    as === "label_longitude_adjusted" && calculate.includes("state_code === '1'")));
  assert.ok(labels.find((layer) => layer.mark.align === "right").transform.some(({ calculate, as }) =>
    as === "label_longitude_adjusted" && calculate.includes("state_code === '2'")));
  assert.equal(spec.layer.filter((layer) =>
    ["properties.abbreviation", "properties.facility_count"].includes(layer.encoding?.text?.field)).length, 0,
  "no labels are drawn inside only the largest circles");
  const leaders = spec.layer.find((layer) => layer.mark?.type === "rule");
  assert.ok(leaders, "external labels connect to their circles with leader rules");
  assert.equal(leaders.transform.some(({ filter }) => filter), false, "all nine circles have leader rules");
  assert.equal(leaders.encoding.longitude2.field, "label_longitude_adjusted");
  assert.equal(leaders.encoding.latitude2.field, "label_latitude_adjusted");
});

test("V01 count symbols preserve all nine source jurisdiction totals and honest anchors", () => {
  const dataPath = new URL("../public/data/v01_jurisdiction_counts.geojson", import.meta.url);
  assert.ok(existsSync(dataPath), "the reproducible jurisdiction-count data file is required");
  const collection = JSON.parse(readFileSync(dataPath, "utf8"));
  const states = readPublicJson("data/state_rates.geojson").features;
  const byCode = new Map(states.map((feature) => [feature.properties.state_code, feature]));
  const counts = Object.fromEntries(collection.features.map((feature) =>
    [feature.properties.state_code, feature.properties.facility_count]));
  assert.deepEqual(counts, {
    "1": 50, "2": 48, "3": 37, "4": 10, "5": 24,
    "6": 3, "7": 3, "8": 6, "9": 1,
  });
  assert.equal(collection.features.length, 9);
  assert.equal(new Set(collection.features.map(({ properties }) => properties.state_code)).size, 9);
  assert.equal(collection.features.reduce((sum, feature) => sum + feature.properties.facility_count, 0), 182);
  assert.ok(collection.features.every(({ properties }) =>
    properties.label === `${properties.abbreviation} · ${properties.facility_count}`),
  "the external label repeats each jurisdiction's exact source-derived count");
  assert.equal(collection.metadata.source_facility_count, 182);
  assert.equal(collection.metadata.unique_globalid_count, 182);
  for (const feature of collection.features) {
    const { state_code: code, facility_count: count, longitude, latitude, anchor_kind: anchorKind } = feature.properties;
    assert.equal(count, byCode.get(code).properties.facility_count);
    assert.ok(Number.isFinite(longitude) && Number.isFinite(latitude));
    assert.equal(feature.properties.globalid, undefined);
    assert.equal(feature.properties.area_hectares, undefined);
    if (code !== "9") {
      assert.equal(anchorKind, "representative-jurisdiction-anchor");
      assert.ok(insideGeometry([longitude, latitude], byCode.get(code).geometry), "anchor must fall inside its jurisdiction");
    } else {
      assert.equal(anchorKind, "norfolk-island-locator");
      assert.match(feature.properties.anchor_note, /approximate.*not an individual garden/i);
      assert.match(feature.properties.state, /Other Territories/i);
    }
  }
});

test("V01 copy leads with counts and links raw totals to population-adjusted rates", () => {
  const footprint = pageStory.sections.find(({ id }) => id === "footprint");
  const v01Chart = chartCards.find(({ id }) => id === "V01");
  assert.match(footprint.question, /where are more known.*(facilities|gardens)/i);
  assert.match(v01Chart.title, /135 of 182/i);
  assert.match(footprint.intro, /circle area/i);
  assert.match(footprint.intro, /representative.*not individual gardens/i);
  assert.doesNotMatch(footprint.intro, /density contour|regional profile|165 facilities/i);
  const v01 = footprint.chartTransitions.find(({ afterChart }) => afterChart === "V01").text;
  const v02 = footprint.chartTransitions.find(({ afterChart }) => afterChart === "V02").text;
  const v03 = footprint.chartTransitions.find(({ afterChart }) => afterChart === "V03").text;
  const v04 = footprint.chartTransitions.find(({ afterChart }) => afterChart === "V04").text;
  assert.match(v01, /raw jurisdiction counts/i);
  assert.match(v02, /population.*rate/i);
  assert.match(v03, /ACT.*sixth.*first/i);
  assert.match(v04, /3,739 ha/i);
  assert.ok([v01, v02, v03, v04].every((copy) => copy.length <= 230));
});

test("V01 hit testing is limited to count circles, not text labels", () => {
  const styles = readFileSync(new URL("../src/site.css", import.meta.url), "utf8");
  assert.match(styles, /#chart-mount-V01 \.layer_2_marks path\s*\{\s*pointer-events:\s*all\s*!important;/);
  assert.match(styles, /#chart-mount-V01 \.layer_3_marks,\s*#chart-mount-V01 \.layer_4_marks\s*\{\s*pointer-events:\s*none\s*!important;/);
  assert.match(styles, /#chart-mount-V01 \.layer_4_marks\s*\{\s*pointer-events:\s*none\s*!important;/);
});
