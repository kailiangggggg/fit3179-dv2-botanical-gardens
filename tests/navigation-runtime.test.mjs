import assert from "node:assert/strict";
import { test } from "node:test";
import { getActiveSectionId } from "../src/navigation-runtime.js";

test("the section rail follows the heading nearest the activation line", () => {
  const sections = [
    { id: "footprint", top: -2200 },
    { id: "records", top: 20 },
    { id: "origins", top: 4100 },
    { id: "evidence", top: 7800 },
  ];
  assert.equal(getActiveSectionId(sections, 270), "records");
});

test("the first section stays active before any heading reaches the activation line", () => {
  assert.equal(getActiveSectionId([
    { id: "footprint", top: 520 },
    { id: "records", top: 3000 },
  ], 270), "footprint");
});
