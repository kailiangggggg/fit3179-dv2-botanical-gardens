import assert from "node:assert/strict";
import test from "node:test";

import { formatLegendActionName, isLegendActivationKey } from "../src/legend-accessibility.js";

test("legend labels describe the ranking filter action", () => {
  assert.equal(formatLegendActionName("Victoria"), "Filter ranking lines to Victoria");
});

test("Enter and Space activate a focused legend label", () => {
  assert.equal(isLegendActivationKey("Enter"), true);
  assert.equal(isLegendActivationKey(" "), true);
  assert.equal(isLegendActivationKey("ArrowDown"), false);
});
