import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildV01LocatorGeoJSON } from "../src/v01-locator-geometry.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(projectRoot, "public");
const manifestPath = path.join(publicRoot, "specs", "chart-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const v01 = manifest.charts.find((chart) => chart.id === "V01");
if (!v01?.support_views?.regional?.maps) throw new Error("The V01 regional bounds are missing from the chart manifest.");
const outputPath = path.resolve(publicRoot, v01.support_views.regional.locator_data_file);
if (!outputPath.startsWith(path.join(publicRoot, "data") + path.sep)) {
  throw new Error("The V01 locator geometry output must stay inside public/data.");
}

const geometry = buildV01LocatorGeoJSON(v01.support_views.regional.maps);
fs.writeFileSync(outputPath, `${JSON.stringify(geometry, null, 2)}\n`, "utf8");
console.log(`Built ${geometry.features.length} V01 locator features from two manifest-defined windows.`);
