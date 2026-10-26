import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { pageStory } from "../src/site-content.js";

const css = readFileSync(new URL("../src/site.css", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../src/content-renderer.js", import.meta.url), "utf8");
const rule = (selector) => {
  const match = css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]+)\\}"));
  assert.ok(match, `Expected CSS selector ${selector}`);
  return match[1];
};

test("chart conclusions are more readable than method captions and not styled like footnotes", () => {
  assert.match(rule(".figure-caption"), /font-size:\s*14px\s*;/);
  assert.match(rule(".figure-caption"), /line-height:\s*1\.5\s*;/);
  assert.match(rule(".chart-transition"), /font-size:\s*16px\s*;/);
  assert.match(rule(".chart-transition"), /line-height:\s*1\.5\s*;/);
  assert.match(rule(".section-copy"), /font-size:\s*16px\s*;/);
  assert.match(rule(".chart-transition-label"), /font-weight:\s*700\s*;/);
  assert.match(renderer, /"What this tells us"/);
  assert.match(renderer, /article\.append\(figure\);\s*if \(transition\) article\.append\(renderChartTransition\(transition\)\);\s*article\.append\(renderChartNotes\(chart\), actions\);/);
});

test("all thirteen chart transitions state an evidence-led message, not just point to the next chart", () => {
  const transitions = pageStory.sections.flatMap(({ chartTransitions = [] }) => chartTransitions);
  assert.equal(transitions.length, 13);
  assert.equal(new Set(transitions.map(({ afterChart }) => afterChart)).size, 13);
  for (const { afterChart, text: copy } of transitions) {
    assert.ok(copy.length <= 230, `${afterChart} is longer than the approved concise story limit`);
    assert.ok(copy.length >= 100, `${afterChart} should explain the evidence, not just offer directions`);
    assert.match(copy, /[.!?]/, `${afterChart} needs a complete reading takeaway`);
  }
  const byId = Object.fromEntries(transitions.map(({ afterChart, text }) => [afterChart, text]));
  assert.match(byId.V01, /135 of 182/);
  assert.match(byId.V02, /12\.25.*per million/);
  assert.match(byId.V03, /sixth.*first/i);
  assert.match(byId.V04, /3,739/);
  assert.match(byId.V05, /National Seed Bank.*16,323.*Australian PlantBank.*4,743/i);
  assert.match(byId.V05, /not total holdings.*verified species richness/i);
  assert.match(byId.V06, /3,240.*1,897.*surviv/i);
  assert.match(byId.V07, /4,321.*not.*accession date/i);
  assert.match(byId.V08, /preserved.*no usable years/i);
  assert.match(byId.V09, /1,843.*not.*conservation/i);
  assert.match(byId.V10, /Perth.*Canberra.*Snowy Mountains.*Blue Mountains.*Illawarra/i);
  assert.match(byId.V10, /9,677.*38,099.*25\.4%/);
  assert.match(byId.V11, /10,949.*33,765.*four/i);
  assert.match(byId.V12, /2,921.*12,871.*22\.7%.*sample may not cover every region/i);
  assert.match(byId.V13, /four.*no usable.*don't show every collecting event/i);
});
