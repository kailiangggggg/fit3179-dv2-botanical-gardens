import assert from "node:assert/strict";
import test from "node:test";

import { formatLegendActionName, isLegendActivationKey, toggleLegendSelection } from "../src/legend-accessibility.js";

test("legend labels describe the ranking filter action", () => {
  assert.equal(formatLegendActionName("Victoria"), "Filter ranking lines to Victoria");
});

test("Enter and Space activate a focused legend label", () => {
  assert.equal(isLegendActivationKey("Enter"), true);
  assert.equal(isLegendActivationKey(" "), true);
  assert.equal(isLegendActivationKey("ArrowDown"), false);
});

test("legend pressed state follows multi-select toggles", () => {
  let active = toggleLegendSelection(new Set(), "Victoria");
  assert.deepEqual([...active], ["Victoria"]);

  active = toggleLegendSelection(active, "Western Australia");
  assert.deepEqual([...active], ["Victoria", "Western Australia"]);

  active = toggleLegendSelection(active, "Victoria");
  assert.deepEqual([...active], ["Western Australia"]);
  assert.deepEqual([...toggleLegendSelection(active, "Western Australia")], []);
});
