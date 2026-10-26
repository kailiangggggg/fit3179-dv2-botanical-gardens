import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { chartAbbreviationCodes, regionAbbreviations } from "../src/site-content.js";

const codePairs = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  ACT: "Australian Capital Territory",
  NT: "Northern Territory",
  OT: "Other Territories",
};
const eight = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

test("every map and ranking abbreviation is expanded using one consistent glossary", () => {
  assert.deepEqual(regionAbbreviations, codePairs);
  assert.deepEqual(chartAbbreviationCodes.V01, [...eight, "OT"]);
  assert.deepEqual(chartAbbreviationCodes.V02, eight);
  assert.deepEqual(chartAbbreviationCodes.V03, eight);
});

test("seed-bank charts explain the shortened WA and SA organisation names", () => {
  for (const chartId of ["V05", "V12", "V13"]) {
    assert.deepEqual(chartAbbreviationCodes[chartId], ["WA", "SA"]);
  }
  for (const chartId of ["V04", "V06", "V07", "V08", "V09", "V10", "V11"]) {
    assert.equal(chartAbbreviationCodes[chartId], undefined);
  }
});

test("abbreviation key is visible below the figure, not hidden in methodology", () => {
  const renderer = readFileSync(new URL("../src/content-renderer.js", import.meta.url), "utf8");
  assert.match(renderer, /function renderAbbreviationKey\(chart\)/);
  assert.match(renderer, /State and territory abbreviations/);
  assert.match(renderer, /element\("dl",\s*"abbreviation-key-list"\)/);
  assert.match(renderer, /figure\.append\(topLine, mount\);\s*const abbreviationKey = renderAbbreviationKey\(chart\);\s*if \(abbreviationKey\) figure\.append\(abbreviationKey\);/);
  const css = readFileSync(new URL("../src/site.css", import.meta.url), "utf8");
  assert.match(css, /\.abbreviation-key-list\s*\{/);
  assert.match(css, /\.abbreviation-key-pair\s*\{/);
  assert.match(css, /\.abbreviation-key-list\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
  assert.match(css, /\.abbreviation-key-pair dt\s*\{[^}]*white-space:\s*nowrap;/s);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
});
