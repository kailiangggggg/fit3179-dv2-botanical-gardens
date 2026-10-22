import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as chartRuntime from "../src/chart-runtime.js";
import {
  adaptChartSpec,
  localizeDataUrls,
  resolveChartSpecUrl,
} from "../src/chart-runtime.js";

const v01Spec = JSON.parse(
  readFileSync(new URL("../public/specs/V01-density-contour-map.json", import.meta.url), "utf8"),
);
const facilityPoints = JSON.parse(
  readFileSync(new URL("../public/data/facility_points.geojson", import.meta.url), "utf8"),
).features;
const regionalProfiles = JSON.parse(
  readFileSync(new URL("../public/data/v01_regional_profiles.geojson", import.meta.url), "utf8"),
).features;
const belowContourPoints = JSON.parse(
  readFileSync(new URL("../public/data/v01_density_unrepresented.geojson", import.meta.url), "utf8"),
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

test("archived V01 density evidence remains source-linked but hidden from the approved story", () => {
  const pointLayer = v01Spec.layer.find((layer) => layer.data?.url === "../data/v01_density_unrepresented.geojson");
  const contourLayers = v01Spec.layer.filter((layer) =>
    layer.data?.url === "../data/v01_density_contours.geojson");
  assert.equal(pointLayer.mark.type, "circle");
  assert.equal(belowContourPoints.length, 31);
  assert.equal(new Set(belowContourPoints.map((feature) => feature.properties.globalid)).size, 31);
  assert.ok(belowContourPoints.every((feature) =>
    facilityPoints.some((source) => source.properties.globalid === feature.properties.globalid
      && source.geometry.coordinates.join(",") === feature.geometry.coordinates.join(","))));
  assert.equal(pointLayer.mark.size, 32);
  assert.equal(pointLayer.mark.fill, "#fffdf7");
  assert.equal(pointLayer.mark.stroke, "#263a31");
  assert.equal(pointLayer.encoding.size, undefined);
  assert.equal(pointLayer.encoding.color, undefined);
  assert.equal(pointLayer.encoding.longitude.field, "properties.longitude");
  assert.equal(pointLayer.encoding.latitude.field, "properties.latitude");
  assert.equal(pointLayer.encoding.tooltip.find(({ title }) => title === "Registered area (source ha)").field, "properties.area_text");
  assert.equal(contourLayers.length, 4);
  assert.deepEqual(
    contourLayers.map((layer) => layer.transform[0].filter.match(/=== ([0-9.]+)/)?.[1]),
    ["0.1", "0.2", "0.4", "0.8"],
  );
  assert.ok(contourLayers.every((layer) => layer.mark.stroke && layer.encoding.shape.field === "geometry"));
  assert.deepEqual(v01.support_views.regional.maps.map(({ id }) => id), ["V01-SYD", "V01-MELB"]);
  assert.equal(v01.support_views.quantitative.id, "V01-AREA");
  assert.equal(manifest.charts.length, 13);
  assert.equal(manifest.rubric_chart_count, 13);
  assert.equal(manifest.map_count, 3);
  assert.equal(manifest.advanced_idiom_types.length, 8);
  assert.equal(v01.idiom, "Proportional-symbol map");
  assert.equal(v01.support_views.default_visible, false);
  assert.equal(chartRuntime.shouldRenderV01SupportViews(v01), false);
  assert.equal(v01.spec, "specs/V01-facility-symbol-map.json");
  assert.deepEqual(v01.data_files, [
    "data/state_rates.geojson",
    "data/v01_jurisdiction_counts.geojson",
  ]);
});

test("V01 keeps 14 and 18 regional source points with deterministic S/M IDs and exact values", () => {
  const rawSource = readFileSync(new URL("../public/data/facility_points.geojson", import.meta.url), "utf8");
  const sourceById = new Map(facilityPoints.map((feature) => [feature.properties.globalid, feature]));
  const cases = [
    { name: "Sydney", prefix: "S", count: 14, bounds: [150.6, 151.4, -34.2, -33.5] },
    { name: "Melbourne", prefix: "M", count: 18, bounds: [144.55, 145.4, -38.25, -37.55] },
  ];
  for (const item of cases) {
    const [west, east, south, north] = item.bounds;
    const sourceRegion = facilityPoints
      .filter((feature) => {
        const [longitude, latitude] = feature.geometry.coordinates;
        return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
      })
      .sort((first, second) => first.properties.globalid < second.properties.globalid ? -1 : 1);
    const profileRegion = regionalProfiles
      .filter((feature) => feature.properties.kind === "facility" && feature.properties.region === item.name)
      .sort((first, second) => first.properties.short_id.localeCompare(second.properties.short_id));
    assert.equal(sourceRegion.length, item.count);
    assert.equal(profileRegion.length, item.count);
    assert.equal(new Set(profileRegion.map((feature) => feature.properties.globalid)).size, item.count);
    for (let index = 0; index < item.count; index += 1) {
      const source = sourceRegion[index];
      const row = profileRegion[index];
      const properties = row.properties;
      const expectedId = item.prefix + String(index + 1).padStart(2, "0");
      assert.equal(properties.short_id, expectedId);
      assert.equal(properties.globalid, source.properties.globalid);
      assert.deepEqual(row.geometry.coordinates, source.geometry.coordinates);
      assert.equal(properties.longitude, source.properties.longitude);
      assert.equal(properties.latitude, source.properties.latitude);
      assert.equal(properties.area_hectares, source.properties.area_hectares);
      assert.ok(properties.display_label.startsWith(expectedId + " · " + source.properties.feature_name));
      const marker = '"globalid":"' + source.properties.globalid + '"';
      const start = rawSource.indexOf(marker);
      const token = rawSource.slice(start, start + 1600).match(/"area_hectares"\s*:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/)?.[1];
      assert.equal(properties.area_text, token);
      const precision = Number(token) < 10 ? 2 : 1;
      assert.equal(properties.area_label, Number(token).toFixed(precision) + " ha");
      assert.ok(Number.isFinite(properties.x_km) && Number.isFinite(properties.y_km));
    }
  }
});

test("V01 regional profile adapters preserve linked data and the common logarithmic scale", () => {
  const cases = [
    { spec: sydneySpec, id: "V01-SYD", name: "Sydney", count: 14 },
    { spec: melbourneSpec, id: "V01-MELB", name: "Melbourne", count: 18 },
  ];
  for (const item of cases) {
    const supportView = v01.support_views.regional.maps.find((view) => view.id === item.id);
    for (const viewportWidth of [320, 442, 550, 899]) {
      const adapted = adaptChartSpec(
        item.spec,
        item.id,
        viewportWidth,
        facilityPoints,
        regionalProfiles,
        supportView,
      );
      const mapView = adapted.hconcat?.[0] ?? adapted.vconcat?.[0];
      const mapPointLayer = mapView.layer.find((layer) => layer.mark?.type === "circle");
      const mapFacilities = mapPointLayer.data.values.filter((feature) => feature.properties.kind === "facility");
      assert.equal(mapFacilities.length, item.count);
      assert.equal(new Set(mapFacilities.map((feature) => feature.properties.globalid)).size, item.count);
      assert.ok(mapFacilities.every((feature) =>
        sourceById(feature.properties.globalid).geometry.coordinates.join(",") === feature.geometry.coordinates.join(",")));
      assert.equal(mapPointLayer.encoding.x.field, "properties.x_km");
      assert.equal(mapPointLayer.encoding.y.field, "properties.y_km");

      let areaView;
      let nameView;
      if (viewportWidth < 400) {
        nameView = adapted.vconcat[1].hconcat[0];
        areaView = adapted.vconcat[1].hconcat[1];
      } else if (viewportWidth < 760) {
        nameView = adapted.hconcat[1].hconcat[0];
        areaView = adapted.hconcat[1].hconcat[1];
      } else {
        nameView = adapted.hconcat[1].hconcat[0];
        areaView = adapted.hconcat[1].hconcat[1];
      }
      const rows = areaView.data.values.filter((feature) => feature.properties.kind === "facility");
      assert.equal(rows.length, item.count);
      assert.deepEqual(
        rows.map((feature) => feature.properties.globalid).sort(),
        mapFacilities.map((feature) => feature.properties.globalid).sort(),
      );
      if (nameView) {
        const labels = nameView.data.values.filter((feature) => feature.properties.kind === "facility");
        assert.equal(labels.length, item.count);
        assert.ok(labels.every((feature) => feature.properties.display_label.includes(feature.properties.short_id)));
        assert.ok(labels.every((feature) => [
          feature.properties.display_label_line1,
          feature.properties.display_label_line2,
        ].filter(Boolean).join(" ") === feature.properties.display_label));
      }
      const point = areaView.layer?.[0] ?? areaView;
      assert.equal(point.encoding.x.field, "properties.area_hectares");
      assert.equal(point.encoding.x.scale.type, "log");
      assert.deepEqual(point.encoding.x.scale.domain, [0.5, 1000]);
      assert.deepEqual(point.encoding.tooltip.map(({ field }) => field), [
        "properties.short_id",
        "properties.feature_name",
        "properties.area_text",
      ]);
      assert.equal(point.encoding.y.field, "properties.display_order");
      assert.ok(point.encoding.color);
    }

    const linearView = {
      ...supportView,
      area_scale: { type: "linear", domain_ha: [0, 500], axis_title: "Registered ha · linear" },
    };
    const linear = adaptChartSpec(item.spec, item.id, 442, facilityPoints, regionalProfiles, linearView);
    const linearAreaView = linear.hconcat[1].hconcat[1];
    assert.equal(linearAreaView.layer[0].encoding.x.scale.type, "linear");
    assert.deepEqual(linearAreaView.layer[0].encoding.x.scale.domain, [0, 500]);
    assert.ok(regionalProfiles
      .filter((feature) => feature.properties.kind === "facility" && feature.properties.region === item.name)
      .every((feature) => feature.properties.area_hectares <= 500));
  }
});

test("V01 narrow regional profiles show full names and rounded hectares without axis truncation", () => {
  const cases = [
    { spec: sydneySpec, id: "V01-SYD", name: "Sydney", count: 14 },
    { spec: melbourneSpec, id: "V01-MELB", name: "Melbourne", count: 18 },
  ];
  for (const item of cases) {
    const supportView = v01.support_views.regional.maps.find(({ id }) => id === item.id);
    for (const viewportWidth of [320, 390]) {
      const adapted = adaptChartSpec(
        item.spec,
        item.id,
        viewportWidth,
        facilityPoints,
        regionalProfiles,
        supportView,
      );
      const profile = adapted.vconcat[1];
      assert.ok(Array.isArray(profile.hconcat), "narrow profile needs separate full-name and area views");
      const [nameView, areaView] = profile.hconcat;
      const names = nameView.data.values.filter(({ properties }) => properties.kind === "facility");
      const points = areaView.data.values.filter(({ properties }) => properties.kind === "facility");
      assert.equal(names.length, item.count);
      assert.equal(points.length, item.count);
      for (const row of names) {
        const properties = row.properties;
        assert.equal(
          [properties.mobile_name_line1, properties.mobile_name_line2].filter(Boolean).join(" "),
          properties.feature_name,
          properties.short_id + " name must remain complete",
        );
        assert.equal(
          properties.mobile_value_label,
          properties.short_id + " · " + properties.area_label,
          properties.short_id + " must retain its visible rounded area",
        );
      }
      const point = areaView.layer[0];
      assert.equal(point.encoding.x.scale.type, "log");
      assert.deepEqual(point.encoding.x.scale.domain, [0.5, 1000]);
      assert.equal(point.encoding.y.field, "properties.display_order");
      assert.deepEqual(
        points.map(({ properties }) => properties.globalid).sort(),
        names.map(({ properties }) => properties.globalid).sort(),
      );
    }
  }
});

test("V01 keeps every under-100-ha source value on a collision-free linear axis", () => {
  const sourceById = new Map(facilityPoints.map((feature) => [feature.properties.globalid, feature.properties.area_hectares]));
  for (const viewportWidth of [266, 328, 674, 899, 1114]) {
    const quantitative = adaptChartSpec(quantitativeSpec, "V01-AREA", viewportWidth, facilityPoints);
    assert.equal(quantitative.data.values.length, 165);
    assert.ok(quantitative.data.values.every((point) => point.area >= 0 && point.area < 100));
    assert.equal(new Set(quantitative.data.values.map(({ id }) => id)).size, 165);
    assert.equal(quantitative.encoding.x.scale.type, "linear");
    assert.deepEqual(quantitative.encoding.x.scale.domain, [0, 100]);
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
          "V01 points overlap at " + viewportWidth + "px",
        );
      }
    }
  }
});

function sourceById(globalId) {
  return facilityPoints.find((feature) => feature.properties.globalid === globalId);
}

test("V01 legacy supporting charts stay hidden in the default story", () => {
  assert.equal(typeof chartRuntime.shouldRenderV01SupportViews, "function");
  assert.equal(chartRuntime.shouldRenderV01SupportViews({ support_views: { default_visible: false } }), false);
  assert.equal(chartRuntime.shouldRenderV01SupportViews({ support_views: { default_visible: true } }), true);
  assert.equal(chartRuntime.shouldRenderV01SupportViews({ support_views: {} }), true);
  assert.equal(chartRuntime.shouldRenderV01SupportViews({}), false);
});
