import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "vega-lite";
import * as vega from "vega";
import { chartCards } from "../src/site-content.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(projectRoot, "public");
const failures = [];
let warningCount = 0;
let validatedSpecCount = 0;

function findDataUrls(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) findDataUrls(item, output);
    return output;
  }
  if (value.data && typeof value.data.url === "string") output.push(value.data.url);
  for (const child of Object.values(value)) findDataUrls(child, output);
  return output;
}

function findColorSchemes(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) findColorSchemes(item, output);
    return output;
  }
  if (typeof value.scale?.scheme === "string") output.push(value.scale.scheme);
  for (const child of Object.values(value)) findColorSchemes(child, output);
  return output;
}

for (const chart of chartCards) {
  const specs = [{ id: chart.id, path: chart.spec }];

  for (const entry of specs) {
    const specPath = path.join(publicRoot, entry.path);
    if (!fs.existsSync(specPath)) {
      failures.push(`${entry.id}: missing spec ${entry.path}`);
      continue;
    }

    let spec;
    try {
      spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
    } catch (error) {
      failures.push(`${entry.id}: invalid JSON (${error.message})`);
      continue;
    }

    if (!String(spec.$schema ?? "").includes("vega-lite/v5.json")) {
      failures.push(`${entry.id}: expected the course-aligned Vega-Lite v5 schema`);
    }

    for (const url of findDataUrls(spec)) {
      if (/^https?:/i.test(url)) {
        failures.push(`${entry.id}: runtime data URL is external (${url})`);
        continue;
      }
      const resolved = path.resolve(path.dirname(specPath), url);
      if (!resolved.startsWith(publicRoot + path.sep) || !fs.existsSync(resolved)) {
        failures.push(`${entry.id}: data URL does not resolve locally (${url})`);
      }
    }

    for (const scheme of findColorSchemes(spec)) {
      if (!vega.scheme(scheme)) failures.push(`${entry.id}: unregistered Vega color scheme (${scheme})`);
    }

    try {
      const result = compile(spec, { logger: { warn: (...messages) => {
        warningCount += 1;
        failures.push(`${entry.id}: Vega-Lite warning: ${messages.join(" ")}`);
      } } });
      vega.parse(result.spec);
      validatedSpecCount += 1;
    } catch (error) {
      failures.push(`${entry.id}: Vega-Lite compile/Vega parse failed (${error.message})`);
    }
  }

  for (const relativeDataPath of chart.data_files) {
    if (!fs.existsSync(path.join(publicRoot, relativeDataPath))) {
      failures.push(`${chart.id}: missing chart data file ${relativeDataPath}`);
    }
  }
}

const actualMapCount = chartCards.filter((chart) => chart.is_map).length;
if (chartCards.length !== 13 || new Set(chartCards.map((chart) => chart.id)).size !== 13) {
  failures.push("Expected 13 uniquely identified chart groups.");
}
if (actualMapCount !== 3) {
  failures.push(`Expected three geographic charts, found ${actualMapCount}.`);
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${chartCards.length} chart groups and ${validatedSpecCount} Vega-Lite v5 specs; ${actualMapCount} map idioms; all local data URLs resolve.`);
}
