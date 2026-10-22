import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "public", "data");
const states = JSON.parse(fs.readFileSync(path.join(dataDir, "state_rates.geojson"), "utf8"));
const facilities = JSON.parse(fs.readFileSync(path.join(dataDir, "facility_points.geojson"), "utf8"));
const outputPath = path.join(dataDir, "v01_jurisdiction_counts.geojson");

const anchors = [
  { code: "1", longitude: 149.6, latitude: -31.5, labelLongitude: 149.6, labelLatitude: -31.5 },
  { code: "2", longitude: 142.5, latitude: -37.1, labelLongitude: 139.8, labelLatitude: -37.0 },
  { code: "3", longitude: 146.8, latitude: -21.2, labelLongitude: 149.1, labelLatitude: -22.8 },
  { code: "4", longitude: 134.5, latitude: -32.3, labelLongitude: 132.0, labelLatitude: -34.1 },
  { code: "5", longitude: 122.0, latitude: -25.2, labelLongitude: 123.8, labelLatitude: -26.4 },
  { code: "6", longitude: 146.5, latitude: -42.2, labelLongitude: 148.2, labelLatitude: -43.4 },
  { code: "7", longitude: 133.0, latitude: -18.6, labelLongitude: 130.5, labelLatitude: -16.8 },
  { code: "8", longitude: 149.08, latitude: -35.52, labelLongitude: 151.2, labelLatitude: -35.05 },
  { code: "9", longitude: 167.9, latitude: -29.0, labelLongitude: 165.3, labelLatitude: -28.2 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function inRing(point, ring) {
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

function inGeometry(point, geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) =>
    inRing(point, polygon[0]) && !polygon.slice(1).some((hole) => inRing(point, hole)));
}

assert(states.features.length === 9, "Expected the eight standard jurisdictions and Other Territories.");
assert(facilities.features.length === 182, "Expected all 182 registered facility records.");
const ids = facilities.features.map((feature) => feature.properties.globalid);
assert(new Set(ids).size === 182, "Facility global IDs must remain unique.");
assert(anchors.length === 9, "Every jurisdiction needs one symbol anchor.");
const statesByCode = new Map(states.features.map((feature) => [feature.properties.state_code, feature]));
const features = anchors.map((anchor) => {
  const state = statesByCode.get(anchor.code);
  assert(state, "Missing state code " + anchor.code);
  const properties = state.properties;
  const stateCode = String(properties.state_code);
  assert(Number.isInteger(properties.facility_count), "Missing jurisdiction count for " + properties.state);
  if (stateCode !== "9") {
    assert(inGeometry([anchor.longitude, anchor.latitude], state.geometry),
      "Representative anchor must remain inside " + properties.state);
  }

  const isOtherTerritories = stateCode === "9";
  const abbreviation = properties.state_abbreviation ?? "OT";
  const label = abbreviation + " · " + properties.facility_count;
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [anchor.longitude, anchor.latitude] },
    properties: {
      state_code: stateCode,
      state: properties.state,
      abbreviation,
      facility_count: properties.facility_count,
      longitude: anchor.longitude,
      latitude: anchor.latitude,
      label_longitude: anchor.labelLongitude,
      label_latitude: anchor.labelLatitude,
      label,
      anchor_kind: isOtherTerritories ? "norfolk-island-locator" : "representative-jurisdiction-anchor",
      anchor_note: isOtherTerritories
        ? "Approximate Norfolk Island locator for the Other Territories aggregate; not an individual garden coordinate."
        : "Representative interior point for the jurisdiction aggregate; not an individual garden coordinate.",
    },
  };
});

assert(features.reduce((sum, feature) => sum + feature.properties.facility_count, 0) === 182,
  "Jurisdiction counts must reconcile to all 182 registered facility records.");
const collection = {
  type: "FeatureCollection",
  metadata: {
    source_files: ["state_rates.geojson", "facility_points.geojson"],
    source_facility_count: facilities.features.length,
    unique_globalid_count: new Set(ids).size,
    jurisdiction_count: features.length,
    aggregation: "One count per ASGS state/territory code; all 182 GA facility features contribute once.",
    symbol_encoding: "Circle area is proportional to facility_count; anchors are jurisdiction reference points, not facility coordinates.",
    other_territories_note: "The single Other Territories facility is on Norfolk Island; its symbol uses an approximate Norfolk Island locator outside the mainland state polygons.",
    projection: "Equal Earth",
  },
  features,
};
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2) + "\n");
console.log("Built nine jurisdiction count symbols from 182 unique GA facilities.");
