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
const manifest = JSON.parse(
  readFileSync(new URL("../public/specs/chart-manifest.json", import.meta.url), "utf8"),
);

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

test("V03 binds its state legend to a filter selection", () => {
  const legendSelection = rankChart.params?.find((param) => param.name === "stateLegend");
  assert.equal(legendSelection?.bind, "legend");
  assert.equal(legendSelection?.select?.toggle, true);
  assert.ok(rankChart.transform.some((transform) => transform.filter?.param === "stateLegend"));
});

test("the chart manifest explains hover and linked-jurisdiction interactions", () => {
  const chartById = new Map(manifest.charts.map((chart) => [chart.id, chart]));
  assert.match(chartById.get("V01").how.interaction, /hover highlights/i);
  assert.match(chartById.get("V02").how.interaction, /linked.*V03/i);
  assert.match(chartById.get("V03").how.interaction, /linked.*V02/i);
  assert.match(chartById.get("V03").how.interaction, /click legend.*focus/i);
});
