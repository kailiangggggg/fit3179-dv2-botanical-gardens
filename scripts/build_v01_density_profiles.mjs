import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "public", "data");
const pointsPath = path.join(dataDir, "facility_points.geojson");
const statesPath = path.join(dataDir, "state_rates.geojson");
const manifestPath = path.join(root, "public", "specs", "chart-manifest.json");
const sourceText = fs.readFileSync(pointsPath, "utf8");
const source = JSON.parse(sourceText);
const states = JSON.parse(fs.readFileSync(statesPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const regionalMaps = manifest.charts.find((chart) => chart.id === "V01").support_views.regional.maps;

const EARTH_KM = 6371.0088;
const AU_CENTER = [133.7751, -25.2744];
const BANDWIDTHS_KM = [25, 50, 100];
const SELECTED_BANDWIDTH_KM = 50;
const GRID_CELL_KM = 15;
const CONTOUR_LEVELS = [0.1, 0.2, 0.4, 0.8];
const EXPECTED_TOTAL = 182;
const expectedRegionCounts = { Sydney: 14, Melbourne: 18 };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function projectAeqd(longitude, latitude) {
  const lon = longitude * Math.PI / 180;
  const lat = latitude * Math.PI / 180;
  const lon0 = AU_CENTER[0] * Math.PI / 180;
  const lat0 = AU_CENTER[1] * Math.PI / 180;
  const deltaLon = lon - lon0;
  const cosC = Math.sin(lat0) * Math.sin(lat)
    + Math.cos(lat0) * Math.cos(lat) * Math.cos(deltaLon);
  const c = Math.acos(Math.max(-1, Math.min(1, cosC)));
  const k = c === 0 ? 1 : c / Math.sin(c);
  const x = EARTH_KM * k * Math.cos(lat) * Math.sin(deltaLon);
  const y = EARTH_KM * k * (
    Math.cos(lat0) * Math.sin(lat)
      - Math.sin(lat0) * Math.cos(lat) * Math.cos(deltaLon)
  );
  return [x, y];
}

function unprojectAeqd(x, y) {
  const rho = Math.hypot(x, y);
  if (rho === 0) return AU_CENTER;
  const c = rho / EARTH_KM;
  const lat0 = AU_CENTER[1] * Math.PI / 180;
  const lon0 = AU_CENTER[0] * Math.PI / 180;
  const sinC = Math.sin(c);
  const cosC = Math.cos(c);
  const latitude = Math.asin(
    cosC * Math.sin(lat0) + (y * sinC * Math.cos(lat0)) / rho,
  );
  const longitude = lon0 + Math.atan2(
    x * sinC,
    rho * Math.cos(lat0) * cosC - y * Math.sin(lat0) * sinC,
  );
  return [longitude * 180 / Math.PI, latitude * 180 / Math.PI];
}

function projectMercatorKm(longitude, latitude) {
  const lon = longitude * Math.PI / 180;
  const lat = Math.max(-85, Math.min(85, latitude)) * Math.PI / 180;
  return [
    EARTH_KM * lon,
    EARTH_KM * Math.log(Math.tan(Math.PI / 4 + lat / 2)),
  ];
}

function sourceAreaToken(feature) {
  const marker = '"globalid":"' + feature.properties.globalid + '"';
  const start = sourceText.indexOf(marker);
  assert(start >= 0, "Could not locate source area token for " + feature.properties.globalid);
  const match = sourceText.slice(start, start + 1600).match(/"area_hectares"\s*:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/);
  assert(match && Number(match[1]) === feature.properties.area_hectares,
    "Source decimal token does not match the parsed hectares for " + feature.properties.globalid);
  return match[1];
}

function displayAreaLabel(area) {
  const digits = area < 10 ? 2 : 1;
  return Number(area).toFixed(digits) + " ha";
}

function regionalLabelLines(shortId, featureName, maximumCharacters = 30) {
  const first = [shortId, "·"];
  const second = [];
  for (const word of featureName.trim().split(/\s+/)) {
    const firstLength = first.join(" ").length + 1 + word.length;
    if (!second.length && firstLength <= maximumCharacters) first.push(word);
    else {
      const secondLength = second.join(" ").length + (second.length ? 1 : 0) + word.length;
      assert(secondLength <= maximumCharacters,
        "Regional facility label needs more than two lines: " + shortId + " · " + featureName);
      second.push(word);
    }
  }
  return [first.join(" "), second.join(" ")];
}

function polygonsFor(geometry) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function clipSegmentToBounds(first, second, bounds) {
  const [x0, y0] = first;
  const [x1, y1] = second;
  const dx = x1 - x0;
  const dy = y1 - y0;
  let start = 0;
  let end = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [
    x0 - bounds.west,
    bounds.east - x0,
    y0 - bounds.south,
    bounds.north - y0,
  ];
  for (let index = 0; index < 4; index += 1) {
    if (p[index] === 0) {
      if (q[index] < 0) return null;
      continue;
    }
    const ratio = q[index] / p[index];
    if (p[index] < 0) start = Math.max(start, ratio);
    else end = Math.min(end, ratio);
    if (start > end) return null;
  }
  return [
    [x0 + start * dx, y0 + start * dy],
    [x0 + end * dx, y0 + end * dy],
  ];
}

function buildRegionalFeatures() {
  const output = [];
  for (const view of regionalMaps) {
    const bounds = {
      west: view.bounds.longitude[0],
      east: view.bounds.longitude[1],
      south: view.bounds.latitude[0],
      north: view.bounds.latitude[1],
    };
    const prefix = view.name === "Sydney" ? "S" : "M";
    const matches = source.features
      .filter((feature) => {
        const [longitude, latitude] = feature.geometry.coordinates;
        return longitude >= bounds.west
          && longitude <= bounds.east
          && latitude >= bounds.south
          && latitude <= bounds.north;
      })
      .sort((first, second) => {
        const a = String(first.properties.globalid).toUpperCase();
        const b = String(second.properties.globalid).toUpperCase();
        return a < b ? -1 : a > b ? 1 : 0;
      });

    assert(matches.length === expectedRegionCounts[view.name],
      view.name + " window has " + matches.length + " source points.");
    const areaOrder = [...matches].sort((first, second) =>
      second.properties.area_hectares - first.properties.area_hectares);
    const rankByGlobalId = new Map(areaOrder.map((feature, index) =>
      [feature.properties.globalid, String(index + 1).padStart(2, "0")]));
    matches.forEach((feature, index) => {
      const properties = feature.properties;
      const shortId = prefix + String(index + 1).padStart(2, "0");
      const [longitude, latitude] = feature.geometry.coordinates;
      const [xKm, yKm] = projectMercatorKm(longitude, latitude);
      const areaText = sourceAreaToken(feature);
      const [displayLabelLine1, displayLabelLine2] = regionalLabelLines(shortId, properties.feature_name);
      output.push({
        type: "Feature",
        geometry: feature.geometry,
        properties: {
          ...properties,
          kind: "facility",
          region: view.name,
          short_id: shortId,
          display_order: rankByGlobalId.get(properties.globalid),
          x_km: xKm,
          y_km: yKm,
          area_text: areaText,
          area_label: displayAreaLabel(properties.area_hectares),
          display_label: shortId + " · " + properties.feature_name,
          display_label_line1: displayLabelLine1,
          display_label_line2: displayLabelLine2,
        },
      });
    });

    const state = view.name === "Sydney" ? "NSW" : "VIC";
    let segmentIndex = 0;
    for (const feature of states.features.filter((item) =>
      item.properties.state_abbreviation === state)) {
      for (const polygon of polygonsFor(feature.geometry)) {
        for (const ring of polygon) {
          for (let index = 0; index < ring.length - 1; index += 1) {
            const clipped = clipSegmentToBounds(ring[index], ring[index + 1], bounds);
            if (!clipped) continue;
            const projected = clipped.map(([longitude, latitude]) =>
              projectMercatorKm(longitude, latitude));
            const segmentId = view.name + "-boundary-" + segmentIndex;
            for (let vertexOrder = 0; vertexOrder < projected.length; vertexOrder += 1) {
              output.push({
                type: "Feature",
                geometry: null,
                properties: {
                  kind: "boundary-point",
                  region: view.name,
                  segment_id: segmentId,
                  vertex_order: vertexOrder,
                  x_km: projected[vertexOrder][0],
                  y_km: projected[vertexOrder][1],
                },
              });
            }
            segmentIndex += 1;
          }
        }
      }
    }
    view.generated_count = matches.length;
    view.generated_boundary_segments = segmentIndex;
  }

  return {
    type: "FeatureCollection",
    metadata: {
      source_file: "facility_points.geojson",
      facility_records: EXPECTED_TOTAL,
      region_ids: "globalid ascending within the manifest-defined window; S01–S14 and M01–M18",
      area_scale_domain_ha: [0.5, 1000],
      area_scale: "shared base-10 logarithmic scale, domain 0.5–1,000 ha; displayed labels use 2 decimals below 10 ha and 1 decimal at or above 10 ha; exact source decimal strings remain in tooltips",
      map_coordinates: "Original GeoJSON point geometry is retained; x_km/y_km are derived local Mercator display coordinates.",
      boundary_source: "state_rates.geojson; clipped to manifest window bounds for display only",
    },
    features: output,
  };
}

function projectLandPolygons() {
  const output = [];
  for (const feature of states.features) {
    if (feature.properties.state_code === "9") continue;
    for (const polygon of polygonsFor(feature.geometry)) {
      output.push(polygon.map((ring) => ring.map(([longitude, latitude]) =>
        projectAeqd(longitude, latitude))));
    }
  }
  return output;
}

function rasterizeRing(mask, sampleColumns, sampleRows, x0, y0, cell, offset, ring, fill) {
  if (ring.length < 4) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of ring) {
    minY = Math.min(minY, point[1]);
    maxY = Math.max(maxY, point[1]);
  }
  const firstRow = Math.max(0, Math.ceil((minY - y0) / cell - offset - 1e-9));
  const lastRow = Math.min(sampleRows - 1, Math.floor((maxY - y0) / cell - offset + 1e-9));
  for (let row = firstRow; row <= lastRow; row += 1) {
    const y = y0 + (row + offset) * cell;
    const intersections = [];
    for (let index = 0; index < ring.length - 1; index += 1) {
      const [x1, y1] = ring[index];
      const [x2, y2] = ring[index + 1];
      if ((y1 > y) === (y2 > y)) continue;
      intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
    }
    intersections.sort((first, second) => first - second);
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const left = intersections[index];
      const right = intersections[index + 1];
      const firstColumn = Math.max(0, Math.ceil((left - x0) / cell - offset - 1e-9));
      const lastColumn = Math.min(
        sampleColumns - 1,
        Math.floor((right - x0) / cell - offset + 1e-9),
      );
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        mask[row * sampleColumns + column] = fill;
      }
    }
  }
}

function rasterizeLand(polygons, grid) {
  const columns = grid.columns - 1;
  const rows = grid.rows - 1;
  const mask = new Uint8Array(columns * rows);
  for (const polygon of polygons) {
    if (!polygon.length) continue;
    rasterizeRing(mask, columns, rows, grid.x0, grid.y0, grid.cell, 0.5, polygon[0], 1);
    for (const hole of polygon.slice(1)) {
      rasterizeRing(mask, columns, rows, grid.x0, grid.y0, grid.cell, 0.5, hole, 0);
    }
  }
  return mask;
}

function buildGrid(points) {
  const padding = 3 * Math.max(...BANDWIDTHS_KM);
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.floor((Math.min(...xs) - padding) / GRID_CELL_KM) * GRID_CELL_KM;
  const maxX = Math.ceil((Math.max(...xs) + padding) / GRID_CELL_KM) * GRID_CELL_KM;
  const minY = Math.floor((Math.min(...ys) - padding) / GRID_CELL_KM) * GRID_CELL_KM;
  const maxY = Math.ceil((Math.max(...ys) + padding) / GRID_CELL_KM) * GRID_CELL_KM;
  const columns = Math.round((maxX - minX) / GRID_CELL_KM) + 1;
  const rows = Math.round((maxY - minY) / GRID_CELL_KM) + 1;
  const grid = {
    x0: minX,
    y0: minY,
    maxX,
    maxY,
    columns,
    rows,
    cell: GRID_CELL_KM,
  };
  grid.landMask = rasterizeLand(projectLandPolygons(), grid);
  return grid;
}

function densityAt(x, y, points, bandwidth) {
  const bandwidthSquared = bandwidth * bandwidth;
  let sum = 0;
  for (const point of points) {
    const dx = x - point[0];
    const dy = y - point[1];
    sum += Math.exp(-(dx * dx + dy * dy) / (2 * bandwidthSquared));
  }
  return sum * (1000 / (2 * Math.PI * bandwidthSquared));
}

function densityGrid(points, grid, bandwidth) {
  const values = new Float32Array(grid.columns * grid.rows);
  for (let row = 0; row < grid.rows; row += 1) {
    const y = grid.y0 + row * grid.cell;
    for (let column = 0; column < grid.columns; column += 1) {
      const x = grid.x0 + column * grid.cell;
      values[row * grid.columns + column] = densityAt(x, y, points, bandwidth);
    }
  }
  return values;
}

function cellDensity(values, grid, row, column) {
  const topLeft = row * grid.columns + column;
  return (
    values[topLeft]
      + values[topLeft + 1]
      + values[topLeft + grid.columns]
      + values[topLeft + grid.columns + 1]
  ) / 4;
}

function countComponents(values, grid, threshold) {
  const rows = grid.rows - 1;
  const columns = grid.columns - 1;
  const visited = new Uint8Array(rows * columns);
  let components = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (visited[index] || !grid.landMask[index]
        || cellDensity(values, grid, row, column) < threshold) continue;
      components += 1;
      const stack = [[row, column]];
      visited[index] = 1;
      while (stack.length) {
        const [currentRow, currentColumn] = stack.pop();
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nextRow = currentRow + dy;
            const nextColumn = currentColumn + dx;
            if (nextRow < 0 || nextColumn < 0 || nextRow >= rows || nextColumn >= columns) continue;
            const nextIndex = nextRow * columns + nextColumn;
            if (visited[nextIndex] || !grid.landMask[nextIndex]
              || cellDensity(values, grid, nextRow, nextColumn) < threshold) continue;
            visited[nextIndex] = 1;
            stack.push([nextRow, nextColumn]);
          }
        }
      }
    }
  }
  return components;
}

function summaryForBandwidth(points, sourceIds, grid, values, bandwidth) {
  const maxRow = grid.rows - 1;
  const maxColumn = grid.columns - 1;
  let peak = 0;
  let peakCell = null;
  const areaByLevel = {};
  for (const level of CONTOUR_LEVELS) areaByLevel[level] = 0;
  for (let row = 0; row < maxRow; row += 1) {
    for (let column = 0; column < maxColumn; column += 1) {
      const index = row * maxColumn + column;
      if (!grid.landMask[index]) continue;
      const value = cellDensity(values, grid, row, column);
      if (value > peak) {
        peak = value;
        peakCell = [grid.x0 + (column + 0.5) * grid.cell, grid.y0 + (row + 0.5) * grid.cell];
      }
      for (const level of CONTOUR_LEVELS) {
        if (value >= level) areaByLevel[level] += grid.cell * grid.cell;
      }
    }
  }
  const belowLowestContourGlobalIds = points.flatMap((point, index) =>
    densityAt(point[0], point[1], points, bandwidth) < CONTOUR_LEVELS[0]
      ? [sourceIds[index]]
      : [],
  );
  const lineCounts = Object.fromEntries(CONTOUR_LEVELS.map((level) => [level, 0]));
  if (peakCell) {
    const [peakLongitude, peakLatitude] = unprojectAeqd(peakCell[0], peakCell[1]);
    return {
      bandwidth_km: bandwidth,
      peak_sites_per_1000_projected_km2: Number(peak.toFixed(4)),
      peak_location: [Number(peakLongitude.toFixed(4)), Number(peakLatitude.toFixed(4))],
      land_area_above_level_km2: areaByLevel,
      connected_land_components_above_lowest_level: countComponents(values, grid, CONTOUR_LEVELS[0]),
      facilities_below_lowest_contour_at_their_location: belowLowestContourGlobalIds.length,
      facilities_below_lowest_contour_globalids: belowLowestContourGlobalIds,
      contour_segments_by_level: lineCounts,
    };
  }
  return { bandwidth_km: bandwidth, peak_sites_per_1000_projected_km2: 0 };
}

const edgePairsByCase = {
  1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]],
  6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]],
  11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]],
};

function contourSegmentsAtLevel(values, grid, level) {
  const segments = [];
  const columns = grid.columns;
  for (let row = 0; row < grid.rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      if (!grid.landMask[row * (columns - 1) + column]) continue;
      const indices = [
        row * columns + column,
        row * columns + column + 1,
        (row + 1) * columns + column + 1,
        (row + 1) * columns + column,
      ];
      const cellValues = indices.map((index) => values[index]);
      const bits = cellValues.reduce((result, value, index) =>
        result | ((value > level ? 1 : 0) << index), 0);
      if (bits === 0 || bits === 15) continue;
      let pairs = edgePairsByCase[bits];
      if (bits === 5 || bits === 10) {
        const centerHigh = cellValues.reduce((sum, value) => sum + value, 0) / 4 > level;
        if (bits === 5) {
          pairs = centerHigh ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]];
        } else {
          pairs = centerHigh ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]];
        }
      }
      const cornerCoordinates = [
        [grid.x0 + column * grid.cell, grid.y0 + row * grid.cell],
        [grid.x0 + (column + 1) * grid.cell, grid.y0 + row * grid.cell],
        [grid.x0 + (column + 1) * grid.cell, grid.y0 + (row + 1) * grid.cell],
        [grid.x0 + column * grid.cell, grid.y0 + (row + 1) * grid.cell],
      ];
      const edgeDetails = [
        { id: "h:" + row + ":" + column, start: 0, end: 1 },
        { id: "v:" + row + ":" + (column + 1), start: 1, end: 2 },
        { id: "h:" + (row + 1) + ":" + column, start: 2, end: 3 },
        { id: "v:" + row + ":" + column, start: 3, end: 0 },
      ];
      const edgePoints = edgeDetails.map((edge) => {
        const firstValue = cellValues[edge.start];
        const secondValue = cellValues[edge.end];
        const fraction = firstValue === secondValue
          ? 0.5
          : (level - firstValue) / (secondValue - firstValue);
        const firstPoint = cornerCoordinates[edge.start];
        const secondPoint = cornerCoordinates[edge.end];
        return {
          id: edge.id,
          coordinates: [
            firstPoint[0] + fraction * (secondPoint[0] - firstPoint[0]),
            firstPoint[1] + fraction * (secondPoint[1] - firstPoint[1]),
          ],
        };
      });
      for (const pair of pairs ?? []) {
        segments.push([edgePoints[pair[0]], edgePoints[pair[1]]]);
      }
    }
  }
  return segments;
}

function contourSegmentsByLevel(values, grid) {
  return Object.fromEntries(CONTOUR_LEVELS.map((level) => [
    level,
    contourSegmentsAtLevel(values, grid, level),
  ]));
}

function lineFeaturesAtBandwidth(points, bandwidth, segmentsByLevel) {
  const features = [];
  const segmentCounts = {};
  for (const level of CONTOUR_LEVELS) {
    const segments = segmentsByLevel[level];
    segmentCounts[level] = segments.length;
    for (let index = 0; index < segments.length; index += 1) {
      const projected = segments[index].map((point) => point.coordinates);
      const coordinates = projected.map(([x, y]) => unprojectAeqd(x, y));
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: {
          kind: "density-contour",
          bandwidth_km: bandwidth,
          density_sites_per_1000_projected_km2: level,
          segment_id: String(level) + "-" + index,
          grid_cell_km: GRID_CELL_KM,
        },
      });
    }
  }
  return { type: "FeatureCollection", features, segmentsByLevel: segmentCounts };
}

function runDensity() {
  assert(source.features.length === EXPECTED_TOTAL, "Expected 182 source facilities.");
  const ids = source.features.map((feature) => feature.properties.globalid);
  assert(new Set(ids).size === EXPECTED_TOTAL, "Facility global IDs must remain unique.");
  for (const feature of source.features) {
    const [longitude, latitude] = feature.geometry.coordinates;
    assert(longitude === feature.properties.longitude && latitude === feature.properties.latitude,
      "Source coordinates differ from the feature geometry for " + feature.properties.globalid);
    assert(Number.isFinite(feature.properties.area_hectares),
      "Missing or invalid registered hectares for " + feature.properties.globalid);
  }

  const points = source.features.map((feature) =>
    projectAeqd(feature.properties.longitude, feature.properties.latitude));
  const grid = buildGrid(points);
  const summary = {
    source_file: "facility_points.geojson",
    source_facility_count: source.features.length,
    unique_globalid_count: new Set(ids).size,
    method: "Unweighted two-dimensional isotropic Gaussian kernel density estimate over the 182 recorded facility point coordinates.",
    projection: {
      name: "Spherical azimuthal equidistant",
      center_longitude_latitude: AU_CENTER,
      earth_radius_km: EARTH_KM,
      purpose: "Metric distance coordinates for KDE; radial distance from the Australia-centred origin is exact on the sphere.",
      limitations: "Pairwise and tangential scale distortion increases away from the centre; density is per projected-plane area, not a survey-adjusted population rate. The maximum radial scale factor is calculated from the source sites.",
    },
    units: "known-register facility locations per 1,000 projected square kilometres",
    bandwidths_km: BANDWIDTHS_KM,
    selected_bandwidth_km: SELECTED_BANDWIDTH_KM,
    grid_cell_km: GRID_CELL_KM,
    contour_levels_sites_per_1000_projected_km2: CONTOUR_LEVELS,
    coastal_clipping: "Contour segments are emitted only for raster cells whose centres fall inside the state land polygons; boundary placement is therefore approximate to one grid cell, and no coastal edge correction is applied to the KDE.",
    remote_site_note: "The density estimate uses all 182 source coordinates. At the selected 50 km bandwidth, 31 facilities fall below the lowest 0.1 contour level at their recorded location and are marked separately; the original 182-record source remains available. Norfolk Island is plotted outside the state outline. Contours are not facility boundaries or land-area estimates, and they do not show actual botanical coverage or a complete-census surface.",
    area_by_level_note: "The bandwidth_sensitivity[].land_area_above_level_km2 value is the approximate area of rasterized land cells where the modeled density meets or exceeds a contour threshold; it is a grid diagnostic, not registered facility land area or botanical coverage.",
    grid: { columns: grid.columns, rows: grid.rows, projected_extent_km: [grid.x0, grid.y0, grid.maxX, grid.maxY] },
    bandwidth_sensitivity: [],
  };

  const maxRadius = Math.max(...points.map(([x, y]) => Math.hypot(x, y)));
  const angularRadius = maxRadius / EARTH_KM;
  summary.projection.maximum_site_distance_from_centre_km = Number(maxRadius.toFixed(1));
  summary.projection.maximum_radial_tangential_scale_factor = Number(
    (angularRadius === 0 ? 1 : angularRadius / Math.sin(angularRadius)).toFixed(4),
  );

  let selectedContours;
  let selectedUnrepresentedIds;
  for (const bandwidth of BANDWIDTHS_KM) {
    const values = densityGrid(points, grid, bandwidth);
    const entry = summaryForBandwidth(points, ids, grid, values, bandwidth);
    const segmentsByLevel = contourSegmentsByLevel(values, grid);
    entry.contour_segments_by_level = Object.fromEntries(CONTOUR_LEVELS.map((level) => [
      level,
      segmentsByLevel[level].length,
    ]));
    summary.bandwidth_sensitivity.push(entry);
    if (bandwidth === SELECTED_BANDWIDTH_KM) {
      selectedContours = lineFeaturesAtBandwidth(points, bandwidth, segmentsByLevel);
      selectedUnrepresentedIds = entry.facilities_below_lowest_contour_globalids;
      summary.facilities_below_lowest_contour_at_selected_bandwidth = entry.facilities_below_lowest_contour_at_their_location;
      summary.facilities_below_lowest_contour_globalids = selectedUnrepresentedIds;
    }
    console.log(
      "Bandwidth " + bandwidth + "km: peak " + entry.peak_sites_per_1000_projected_km2
      + " sites/1,000 projected km²; "
      + Object.values(entry.contour_segments_by_level).reduce((sum, count) => sum + count, 0)
      + " land contour segments.",
    );
  }

  assert(selectedContours, "Selected density bandwidth was not generated.");
  assert(selectedUnrepresentedIds?.length === 31,
    "The selected 50 km bandwidth should mark the 31 facilities below the lowest contour at their locations.");
  summary.output_contour_segments = selectedContours.features.length;
  fs.writeFileSync(path.join(dataDir, "v01_density_contours.geojson"), JSON.stringify({
    type: "FeatureCollection",
    metadata: {
      bandwidth_km: SELECTED_BANDWIDTH_KM,
      grid_cell_km: GRID_CELL_KM,
      units: summary.units,
      levels: CONTOUR_LEVELS,
      projection: summary.projection.name,
      contour_segments: selectedContours.features.length,
    },
    features: selectedContours.features,
  }) + "\n");
  fs.writeFileSync(path.join(dataDir, "v01_density_summary.json"), JSON.stringify(summary, null, 2) + "\n");
  const unrepresentedIds = new Set(selectedUnrepresentedIds);
  const unrepresentedFeatures = source.features
    .filter((feature) => unrepresentedIds.has(feature.properties.globalid))
    .map((feature) => {
      const [x, y] = projectAeqd(feature.properties.longitude, feature.properties.latitude);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          area_text: sourceAreaToken(feature),
          display_role: "below-lowest-contour-at-location",
          density_at_location_sites_per_1000_projected_km2: Number(densityAt(x, y, points, SELECTED_BANDWIDTH_KM).toFixed(5)),
        },
      };
    });
  fs.writeFileSync(path.join(dataDir, "v01_density_unrepresented.geojson"), JSON.stringify({
    type: "FeatureCollection",
    metadata: {
      source_file: "facility_points.geojson",
      source_facility_count: EXPECTED_TOTAL,
      marked_facility_count: unrepresentedFeatures.length,
      selected_bandwidth_km: SELECTED_BANDWIDTH_KM,
      below_contour_level_sites_per_1000_projected_km2: CONTOUR_LEVELS[0],
      criterion: "Pointwise density estimate from all 182 registered facility locations is below the lowest displayed contour level.",
      source_records_preserved: "The full 182-feature source dataset is unchanged; this subset only controls the national map marks.",
    },
    features: unrepresentedFeatures,
  }) + "\n");
}

const regionalOutput = buildRegionalFeatures();
fs.writeFileSync(path.join(dataDir, "v01_regional_profiles.geojson"), JSON.stringify(regionalOutput) + "\n");
runDensity();
console.log(
  "Built " + regionalMaps.map((view) => view.generated_count + " " + view.name).join(", ")
  + " regional profiles and a reproducible 182-site density surface.",
);
