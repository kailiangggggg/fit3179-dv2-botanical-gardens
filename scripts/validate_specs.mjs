import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "vega-lite";
import * as vega from "vega";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(projectRoot, "public");
const manifestPath = path.join(publicRoot, "specs", "chart-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const failures = [];
let warningCount = 0;

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

for (const chart of manifest.charts) {
  const specPath = path.join(publicRoot, chart.spec);
  if (!fs.existsSync(specPath)) {
    failures.push(`${chart.id}: missing spec ${chart.spec}`);
    continue;
  }

  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  } catch (error) {
    failures.push(`${chart.id}: invalid JSON (${error.message})`);
    continue;
  }

  if (!String(spec.$schema ?? "").includes("vega-lite/v5.json")) {
    failures.push(`${chart.id}: expected the course-aligned Vega-Lite v5 schema`);
  }

  for (const url of findDataUrls(spec)) {
    if (/^https?:/i.test(url)) {
      failures.push(`${chart.id}: runtime data URL is external (${url})`);
      continue;
    }
    const resolved = path.resolve(path.dirname(specPath), url);
    if (!resolved.startsWith(publicRoot + path.sep) || !fs.existsSync(resolved)) {
      failures.push(`${chart.id}: data URL does not resolve locally (${url})`);
    }
  }

  for (const relativeDataPath of chart.data_files) {
    if (!fs.existsSync(path.join(publicRoot, relativeDataPath))) {
      failures.push(`${chart.id}: missing manifest data file ${relativeDataPath}`);
    }
  }

  try {
    const result = compile(spec, { logger: { warn: (...messages) => {
      warningCount += 1;
      failures.push(`${chart.id}: Vega-Lite warning: ${messages.join(" ")}`);
    } } });
    vega.parse(result.spec);
  } catch (error) {
    failures.push(`${chart.id}: Vega-Lite compile/Vega parse failed (${error.message})`);
  }
}

const actualMapCount = manifest.charts.filter((chart) => chart.is_map).length;
if (manifest.charts.length !== manifest.rubric_chart_count) {
  failures.push(`Manifest count mismatch: ${manifest.charts.length} entries vs ${manifest.rubric_chart_count} rubric charts`);
}
if (actualMapCount !== 3 || manifest.map_count !== 3) {
  failures.push(`Map count mismatch: ${actualMapCount} marked charts vs ${manifest.map_count} in manifest`);
}
if (new Set(manifest.advanced_idiom_types).size < 8) {
  failures.push("The chart manifest lists fewer than eight distinct advanced idiom types");
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${manifest.charts.length} Vega-Lite v5 specs; ${actualMapCount} distinct map idioms; ${manifest.advanced_idiom_types.length} advanced idiom types; all local data URLs resolve.`);
}
