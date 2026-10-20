import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildV01AreaComparisonData } from "../src/chart-runtime.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "public", "data", "facility_points.geojson");
const outputPath = path.join(projectRoot, "public", "data", "facility_area_under100_beeswarm.json");
const features = JSON.parse(fs.readFileSync(sourcePath, "utf8")).features;
const { points } = buildV01AreaComparisonData(features, {
  plotWidth: 781,
  chartHeight: 180,
  diameter: 6.2,
  bandLimit: 44,
  groupOffset: { "Botanic Garden": 52, Arboretum: 128 },
});

const output = {
  metadata: {
    source_file: "facility_points.geojson",
    filter: "0 <= properties.area_hectares < 100",
    count: points.length,
    default_plot_width: 781,
    default_plot_height: 180,
    display_y_role: "deterministic collision-avoidance vertical placement; not a measured value",
  },
  points,
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Built the ${points.length}-facility V01 under-100-ha display dataset.`);
