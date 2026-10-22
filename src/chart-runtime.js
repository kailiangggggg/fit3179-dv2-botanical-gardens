export function resolveChartSpecUrl(specPath, baseUrl) {
  return new URL(specPath, baseUrl);
}

export function localizeDataUrls(value, specUrl) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    value.forEach((item) => localizeDataUrls(item, specUrl));
    return value;
  }

  if (value.data && typeof value.data.url === "string") {
    value.data.url = new URL(value.data.url, specUrl).href;
  }
  Object.values(value).forEach((child) => localizeDataUrls(child, specUrl));
  return value;
}

export function buildV01AreaComparisonData(
  facilityFeatures,
  { plotWidth, chartHeight, diameter, bandLimit, groupOffset },
) {
  const selected = facilityFeatures.filter((feature) =>
    feature.properties.area_hectares >= 0 && feature.properties.area_hectares < 100,
  );
  const typeOrder = ["Botanic Garden", "Arboretum"];
  const minimumDistance = diameter + 1;
  const points = [];
  const packingMetrics = {};

  for (const type of typeOrder) {
    const group = selected
      .filter((feature) => feature.properties.feature_subtype === type)
      .sort((first, second) => {
        const areaDifference = first.properties.area_hectares - second.properties.area_hectares;
        if (areaDifference) return areaDifference;
        const firstName = first.properties.feature_name;
        const secondName = second.properties.feature_name;
        return firstName < secondName ? -1 : firstName > secondName ? 1 : 0;
      });
    const placed = [];
    let maximumOffset = 0;

    for (const feature of group) {
      const properties = feature.properties;
      const xPx = properties.area_hectares / 100 * plotWidth;
      const offsets = [0];
      for (let lane = 1; lane <= 24; lane += 1) offsets.push(-lane * minimumDistance, lane * minimumDistance);
      let selectedOffset = null;
      for (const offset of offsets) {
        if (Math.abs(offset) + diameter / 2 > bandLimit) continue;
        const isClear = placed.every((other) =>
          Math.hypot(xPx - other.xPx, offset - other.offset) >= minimumDistance,
        );
        if (isClear) {
          selectedOffset = offset;
          break;
        }
      }
      if (selectedOffset === null) {
        throw new Error(`The ${type} beeswarm cannot pack every source point within its vertical band.`);
      }

      placed.push({ xPx, offset: selectedOffset });
      maximumOffset = Math.max(maximumOffset, Math.abs(selectedOffset));
      points.push({
        id: properties.globalid,
        name: properties.feature_name,
        type,
        area: properties.area_hectares,
        displayY: chartHeight - (groupOffset[type] + selectedOffset),
        locality: properties.locality,
        state: properties.state,
      });
    }

    packingMetrics[type] = {
      count: group.length,
      maxVerticalOffsetPx: maximumOffset,
      pointDiameterPx: diameter,
    };
  }

  if (points.length !== selected.length) {
    throw new Error(`V01 area comparison has ${points.length} points for ${selected.length} eligible facilities.`);
  }
  return { points, packingMetrics };
}

const MERCATOR_EARTH_KM = 6371.0088;

function projectRegionalPoint(longitude, latitude) {
  const longitudeRadians = longitude * Math.PI / 180;
  const latitudeRadians = Math.max(-85, Math.min(85, latitude)) * Math.PI / 180;
  return [
    MERCATOR_EARTH_KM * longitudeRadians,
    MERCATOR_EARTH_KM * Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2)),
  ];
}

function addRegionalLeaderLabels(facilities, bounds, mapWidth, mapHeight) {
  const [westX, southY] = projectRegionalPoint(bounds.longitude[0], bounds.latitude[0]);
  const [eastX, northY] = projectRegionalPoint(bounds.longitude[1], bounds.latitude[1]);
  const spanX = Math.max(1, eastX - westX);
  const spanY = Math.max(1, northY - southY);
  const scalePerPixel = Math.max(spanX / Math.max(1, mapWidth - 18), spanY / Math.max(1, mapHeight - 18));
  const domainWidth = mapWidth * scalePerPixel;
  const domainHeight = mapHeight * scalePerPixel;
  const centerX = (westX + eastX) / 2;
  const centerY = (southY + northY) / 2;
  const xDomain = [centerX - domainWidth / 2, centerX + domainWidth / 2];
  const yDomain = [centerY - domainHeight / 2, centerY + domainHeight / 2];
  const locations = facilities.map((feature) => {
    const properties = feature.properties;
    return {
      feature,
      pixelX: ((properties.x_km - xDomain[0]) / domainWidth) * mapWidth,
      pixelY: ((yDomain[1] - properties.y_km) / domainHeight) * mapHeight,
    };
  });
  for (const location of locations) {
    location.localDensity = locations.filter((other) =>
      other !== location && Math.hypot(other.pixelX - location.pixelX, other.pixelY - location.pixelY) < 34,
    ).length;
  }
  locations.sort((first, second) =>
    second.localDensity - first.localDensity
      || first.feature.properties.short_id.localeCompare(second.feature.properties.short_id));
  const labels = [];
  const leaders = [];
  const labelWidth = 26;
  const labelHeight = 14;
  const markerRadius = 3.5;
  const boxesOverlap = (first, second, gap = 1.5) =>
    first.left < second.right + gap && first.right + gap > second.left
      && first.top < second.bottom + gap && first.bottom + gap > second.top;
  const boxIsClear = (box) => {
    if (box.left < 2 || box.right > mapWidth - 2 || box.top < 2 || box.bottom > mapHeight - 2) return false;
    if (labels.some((placed) => boxesOverlap(box, placed.box))) return false;
    return locations.every((other) => {
      const nearestX = Math.max(box.left, Math.min(other.pixelX, box.right));
      const nearestY = Math.max(box.top, Math.min(other.pixelY, box.bottom));
      return Math.hypot(other.pixelX - nearestX, other.pixelY - nearestY) >= markerRadius + 1.5;
    });
  };
  for (const location of locations) {
    const candidates = [];
    for (const radius of [18, 24, 30, 38, 48, 60, 74, 90, 108, 126]) {
      for (let direction = 0; direction < 32; direction += 1) {
        const angle = direction * Math.PI / 16;
        const x = location.pixelX + Math.cos(angle) * radius;
        const y = location.pixelY + Math.sin(angle) * radius;
        const box = {
          left: x - labelWidth / 2,
          right: x + labelWidth / 2,
          top: y - labelHeight / 2,
          bottom: y + labelHeight / 2,
        };
        if (boxIsClear(box)) candidates.push({ x, y, box, score: radius + direction * 0.001 });
      }
    }
    candidates.sort((first, second) => first.score - second.score);
    let selected = candidates[0];
    if (!selected) {
      for (let y = labelHeight / 2 + 2; y <= mapHeight - labelHeight / 2 - 2; y += labelHeight + 4) {
        for (let x = labelWidth / 2 + 2; x <= mapWidth - labelWidth / 2 - 2; x += labelWidth + 4) {
          const box = {
            left: x - labelWidth / 2,
            right: x + labelWidth / 2,
            top: y - labelHeight / 2,
            bottom: y + labelHeight / 2,
          };
          if (!boxIsClear(box)) continue;
          const score = Math.hypot(x - location.pixelX, y - location.pixelY);
          if (!selected || score < selected.score) selected = { x, y, box, score };
        }
      }
    }
    if (!selected) throw new Error(`Could not place an unobstructed ID label for ${location.feature.properties.short_id}.`);
    labels.push({ location, box: selected.box });
    const properties = location.feature.properties;
    const labelX = xDomain[0] + (selected.x / mapWidth) * domainWidth;
    const labelY = yDomain[1] - (selected.y / mapHeight) * domainHeight;
    properties.label_x_km = labelX;
    properties.label_y_km = labelY;
    leaders.push(
      {
        type: "Feature",
        geometry: null,
        properties: {
          kind: "leader-point",
          region: properties.region,
          leader_id: properties.short_id,
          vertex_order: 0,
          x_km: properties.x_km,
          y_km: properties.y_km,
        },
      },
      {
        type: "Feature",
        geometry: null,
        properties: {
          kind: "leader-point",
          region: properties.region,
          leader_id: properties.short_id,
          vertex_order: 1,
          x_km: labelX,
          y_km: labelY,
        },
      },
    );
  }

  return { xDomain, yDomain, leaders };
}

function replaceRegionalDataSources(value, features) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => replaceRegionalDataSources(item, features));
    return;
  }
  if (value.data?.url?.includes("v01_regional_profiles.geojson")) {
    value.data = { values: features };
  }
  Object.values(value).forEach((child) => replaceRegionalDataSources(child, features));
}

function splitRegionalName(name, maximumCharacters = 28) {
  const lines = [""];
  for (const word of name.trim().split(/\s+/)) {
    const current = lines[lines.length - 1];
    const candidate = current ? current + " " + word : word;
    if (candidate.length <= maximumCharacters || !current) {
      lines[lines.length - 1] = candidate;
    } else {
      if (lines.length === 2) {
        throw new Error("Regional facility name needs more than two mobile lines: " + name);
      }
      lines.push(word);
    }
  }
  return lines;
}

function setRegionalMapDomains(value, xDomain, yDomain) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => setRegionalMapDomains(item, xDomain, yDomain));
    return;
  }
  const xField = value.encoding?.x?.field ?? "";
  const yField = value.encoding?.y?.field ?? "";
  if (xField.endsWith("x_km") || xField.endsWith("label_x_km")) {
    value.encoding.x.scale = { ...(value.encoding.x.scale ?? {}), domain: xDomain, nice: false, zero: false };
  }
  if (yField.endsWith("y_km") || yField.endsWith("label_y_km")) {
    value.encoding.y.scale = { ...(value.encoding.y.scale ?? {}), domain: yDomain, nice: false, zero: false };
  }
  Object.values(value).forEach((child) => setRegionalMapDomains(child, xDomain, yDomain));
}

function adaptV01RegionSpec(spec, supportView, availableWidth, profileFeatures) {
  if (!supportView || !Array.isArray(profileFeatures)) {
    throw new Error("V01 regional profiles need their manifest window and generated feature data.");
  }
  const width = Math.max(240, Math.floor(Number(availableWidth) || 240));
  const region = supportView.name;
  const facilities = profileFeatures
    .filter((feature) => feature.properties.kind === "facility" && feature.properties.region === region)
    .sort((first, second) => first.properties.short_id.localeCompare(second.properties.short_id));
  const regionFeatures = profileFeatures.filter((feature) => feature.properties.region === region);
  const areaScaleConfig = supportView.area_scale ?? {};
  const areaScaleType = areaScaleConfig.type === "linear" ? "linear" : "log";
  const areaDomain = Array.isArray(areaScaleConfig.domain_ha) ? areaScaleConfig.domain_ha : [0.5, 1000];
  const areaAxisTitle = areaScaleConfig.axis_title ?? "Registered ha · log";
  const areaThreshold = areaScaleType === "linear" ? areaDomain[0] + (areaDomain[1] - areaDomain[0]) * 0.5 : 20;
  const areaTicks = (plotWidth) => areaScaleType === "linear"
    ? (plotWidth < 160 ? [0, 250, 500] : [0, 100, 200, 300, 400, 500])
    : (plotWidth < 160 ? [0.5, 50, 1000] : [0.5, 5, 50, 500, 1000]);
  const areaScale = {
    type: areaScaleType,
    ...(areaScaleType === "log" ? { base: 10 } : {}),
    domain: areaDomain,
    nice: false,
    clamp: false,
    ...(areaScaleType === "linear" ? { zero: false } : {}),
  };
  const narrow = width < 400;
  const paired = width >= 400 && width < 760;
  const mapWidth = narrow ? Math.max(240, width - 8) : paired ? (width >= 500 ? 190 : 170) : width <= 480 ? 190 : 240;
  const mapHeight = narrow ? Math.max(220, Math.min(265, Math.round(mapWidth * 0.86))) : width <= 480 ? 250 : 300;
  const adapted = structuredClone(spec);
  const mapView = adapted.hconcat[0];
  const profileGroup = adapted.hconcat[1];
  const mapData = addRegionalLeaderLabels(facilities, supportView.bounds, mapWidth, mapHeight);
  const displayFeatures = [
    ...regionFeatures.filter((feature) => feature.properties.kind !== "facility"),
    ...facilities,
    ...mapData.leaders,
  ];

  mapView.width = mapWidth;
  mapView.height = mapHeight;
  replaceRegionalDataSources(mapView, displayFeatures);
  setRegionalMapDomains(mapView, mapData.xDomain, mapData.yDomain);

  if (paired) {
    const profileWidth = Math.max(220, width - mapWidth - 8);
    const profileHeight = width <= 480 ? 392 : 376;
    const labelWidth = Math.max(112, Math.floor(profileWidth * 0.58));
    const areaWidth = Math.max(112, profileWidth - labelWidth);
    const nameView = {
      width: labelWidth,
      height: profileHeight,
      data: { values: facilities },
      layer: [
        {
          mark: {
            type: "text",
            align: "left",
            baseline: "middle",
            dy: { expr: "datum.properties.display_label_line2 ? -5.5 : 0" },
            font: "Source Sans 3",
            fontSize: 9.6,
            color: "#34443a",
          },
          encoding: {
            x: { value: 2 },
            y: { field: "properties.display_order", type: "ordinal", sort: "ascending", axis: null },
            text: { field: "properties.display_label_line1", type: "nominal" },
          },
        },
        {
          transform: [{ filter: "datum.properties.display_label_line2 !== ''" }],
          mark: {
            type: "text",
            align: "left",
            baseline: "middle",
            dy: 5.5,
            font: "Source Sans 3",
            fontSize: 9.6,
            color: "#34443a",
          },
          encoding: {
            x: { value: 2 },
            y: { field: "properties.display_order", type: "ordinal", sort: "ascending", axis: null },
            text: { field: "properties.display_label_line2", type: "nominal" },
          },
        },
      ],
    };
    const areaView = {
      width: areaWidth,
      height: profileHeight,
      data: { values: facilities },
      layer: [
        {
          mark: { type: "circle", size: 25, stroke: "#fffdf7", strokeWidth: 0.5 },
          encoding: {
            x: {
              field: "properties.area_hectares",
              type: "quantitative",
              scale: { ...areaScale },
              axis: {
                title: areaAxisTitle,
                values: areaTicks(areaWidth),
                grid: true,
                labelFontSize: 8.8,
                titleFontSize: 9,
              },
            },
            y: { field: "properties.display_order", type: "ordinal", sort: "ascending", axis: null },
            color: {
              field: "properties.feature_subtype",
              type: "nominal",
              scale: { domain: ["Botanic Garden", "Arboretum"], range: ["#003F5C", "#B85C00"] },
              legend: null,
            },
            tooltip: [
              { field: "properties.short_id", type: "nominal", title: "ID" },
              { field: "properties.feature_name", type: "nominal", title: "Facility" },
              { field: "properties.area_text", type: "nominal", title: "Registered area (source ha)" },
            ],
          },
        },
        {
          mark: {
            type: "text",
            align: { expr: "datum.properties.area_hectares > " + areaThreshold + " ? 'right' : 'left'" },
            dx: { expr: "datum.properties.area_hectares > " + areaThreshold + " ? -4 : 4" },
            baseline: "middle",
            font: "Source Sans 3",
            fontSize: 8.8,
            color: "#34443a",
            clip: false,
          },
          encoding: {
            x: {
              field: "properties.area_hectares",
              type: "quantitative",
              scale: { ...areaScale },
            },
            y: { field: "properties.display_order", type: "ordinal", sort: "ascending" },
            text: { field: "properties.area_label", type: "nominal" },
          },
        },
      ],
      config: { view: { stroke: null } },
    };
    const profileView = {
      hconcat: [nameView, areaView],
      spacing: 0,
      resolve: { scale: { y: "shared" } },
    };
    delete adapted.hconcat;
    adapted.hconcat = [mapView, profileView];
    adapted.spacing = 8;
    adapted.resolve = { scale: { x: "independent", y: "independent" } };
    return adapted;
  }

  if (narrow) {
    const plotWidth = Math.max(240, width - 8);
    const nameWidth = Math.min(196, Math.max(156, Math.floor(plotWidth * 0.52)));
    const areaWidth = plotWidth - nameWidth;
    const rowHeight = 28;
    const profileHeight = facilities.length * rowHeight + 42;
    const mobileFacilities = facilities.map((feature) => {
      const [mobileNameLine1, mobileNameLine2 = ""] = splitRegionalName(feature.properties.feature_name);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          mobile_name_line1: mobileNameLine1,
          mobile_name_line2: mobileNameLine2,
          mobile_value_label: feature.properties.short_id + " · " + feature.properties.area_label,
        },
      };
    });
    const nameView = {
      width: nameWidth,
      height: profileHeight,
      data: { values: mobileFacilities },
      layer: [
        {
          mark: {
            type: "text",
            align: "left",
            baseline: "middle",
            dy: -9,
            font: "Source Sans 3",
            fontSize: 8.5,
            fontWeight: 600,
            color: "#34443a",
          },
          encoding: {
            x: { value: 2 },
            y: { field: "properties.display_order", type: "ordinal", sort: "ascending", axis: null },
            text: { field: "properties.mobile_value_label", type: "nominal" },
          },
        },
        {
          mark: {
            type: "text",
            align: "left",
            baseline: "middle",
            font: "Source Sans 3",
            fontSize: 8.5,
            color: "#34443a",
          },
          encoding: {
            x: { value: 2 },
            y: { field: "properties.display_order", type: "ordinal", sort: "ascending", axis: null },
            text: { field: "properties.mobile_name_line1", type: "nominal" },
          },
        },
        {
          transform: [{ filter: "datum.properties.mobile_name_line2 !== ''" }],
          mark: {
            type: "text",
            align: "left",
            baseline: "middle",
            dy: 9,
            font: "Source Sans 3",
            fontSize: 8.5,
            color: "#34443a",
          },
          encoding: {
            x: { value: 2 },
            y: { field: "properties.display_order", type: "ordinal", sort: "ascending", axis: null },
            text: { field: "properties.mobile_name_line2", type: "nominal" },
          },
        },
      ],
      config: { view: { stroke: null } },
    };
    const areaView = {
      width: areaWidth,
      height: profileHeight,
      data: { values: mobileFacilities },
      layer: [
        {
          mark: { type: "circle", size: 24, stroke: "#fffdf7", strokeWidth: 0.5 },
          encoding: {
            x: {
              field: "properties.area_hectares",
              type: "quantitative",
              scale: { ...areaScale },
              axis: {
                title: "Registered ha · log",
                values: areaTicks(areaWidth),
                grid: true,
                labelFontSize: 7.4,
                titleFontSize: 8,
              },
            },
            y: { field: "properties.display_order", type: "ordinal", sort: "ascending", axis: null },
            color: {
              field: "properties.feature_subtype",
              type: "nominal",
              scale: { domain: ["Botanic Garden", "Arboretum"], range: ["#003F5C", "#B85C00"] },
              legend: null,
            },
            tooltip: [
              { field: "properties.short_id", type: "nominal", title: "ID" },
              { field: "properties.feature_name", type: "nominal", title: "Facility" },
              { field: "properties.area_text", type: "nominal", title: "Registered area (source ha)" },
            ],
          },
        },
      ],
      config: { view: { stroke: null } },
    };
    const mobileProfile = {
      hconcat: [nameView, areaView],
      spacing: 0,
      resolve: { scale: { y: "shared" } },
    };
    delete adapted.hconcat;
    adapted.vconcat = [mapView, mobileProfile];
    adapted.spacing = 10;
    adapted.resolve = { scale: { x: "independent", y: "independent" } };
    return adapted;
  }

  const [nameView, areaView, valueView] = profileGroup.hconcat;
  const nameWidth = width >= 1000 ? 240 : 210;
  const valueWidth = 86;
  const spacing = 28;
  const areaWidth = Math.max(170, width - mapWidth - nameWidth - valueWidth - spacing);
  profileGroup.spacing = 0;
  nameView.width = nameWidth;
  areaView.width = areaWidth;
  valueView.width = valueWidth;
  for (const view of [nameView, areaView, valueView]) view.height = mapHeight;
  areaView.encoding.x.scale = { ...areaScale };
  areaView.encoding.x.axis.title = areaAxisTitle;
  areaView.encoding.x.axis.values = areaTicks(areaWidth);

  replaceRegionalDataSources(profileGroup, displayFeatures);
  return adapted;
}

function adaptV01AreaSpec(spec, availableWidth, facilityFeatures) {
  if (!Array.isArray(facilityFeatures)) {
    throw new Error("V01 area comparison needs the source facility point collection.");
  }
  const available = Math.max(240, Math.floor(Number(availableWidth) || 240));
  const chartWidth = Math.max(280, available);
  const mobile = available < 480;
  const tablet = available >= 480 && available < 850;
  const plotWidth = Math.max(150, chartWidth - 118);
  const chartHeight = mobile ? 360 : tablet ? 260 : 180;
  const center = mobile ? 90 : tablet ? 65 : 52;
  const groupOffset = { "Botanic Garden": center, Arboretum: chartHeight - center };
  const diameter = mobile ? 3 : 6.2;
  const bandLimit = mobile ? 60 : tablet ? 54 : 44;
  const adapted = structuredClone(spec);
  const packed = buildV01AreaComparisonData(facilityFeatures, {
    plotWidth,
    chartHeight,
    diameter,
    bandLimit,
    groupOffset,
  });

  adapted.width = plotWidth;
  adapted.height = chartHeight;
  adapted.data = { values: packed.points };
  adapted.mark.size = diameter * diameter;
  adapted.encoding.x.scale = { type: "linear", domain: [0, 100], nice: false, zero: true };
  adapted.encoding.x.axis.values = available < 360
    ? [0, 20, 40, 60, 80, 100]
    : [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  adapted.encoding.y.scale = { domain: [0, chartHeight], range: [chartHeight, 0], nice: false, zero: false };
  adapted.encoding.y.axis.values = ["Arboretum", "Botanic Garden"]
    .map((type) => chartHeight - groupOffset[type]);
  adapted.encoding.y.axis.labelExpr = `datum.value === ${chartHeight - groupOffset["Botanic Garden"]} ? 'Botanic Garden' : 'Arboretum'`;
  return adapted;
}

export function adaptChartSpec(spec, chartId, availableWidth, facilityFeatures, profileFeatures, supportView) {
  if (["V01-REGION", "V01-SYD", "V01-MELB"].includes(chartId)) {
    return adaptV01RegionSpec(spec, supportView, availableWidth, profileFeatures);
  }
  if (chartId === "V01-AREA") {
    return adaptV01AreaSpec(spec, availableWidth, facilityFeatures);
  }
  const width = Math.max(320, Math.floor(Number(availableWidth) || 320));
  const adapted = structuredClone(spec);

  function setPlotWidths(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(setPlotWidths);
      return;
    }
    if (typeof value.width === "number") value.width = width;
    Object.values(value).forEach(setPlotWidths);
  }

  setPlotWidths(adapted);

  if (chartId === "V04") {
    adapted.width = width - 20;
    adapted.padding = { left: 20, right: 0, top: 0, bottom: 0 };
    if (width < 560) {
      if (adapted.encoding?.x?.axis) adapted.encoding.x.axis.values = [0.5, 5, 50, 500, 5000];
      if (adapted.encoding?.y?.axis) adapted.encoding.y.axis.labelFontSize = 11;
    }
  }

  if (chartId === "V06") {
    const genusLayer = adapted.layer?.find((layer) => layer.encoding?.text?.field === "genus");
    const familyLayer = adapted.layer?.find((layer) => layer.encoding?.text?.field === "family_header");
    if (genusLayer) {
      const minWidth = Math.max(125, Math.ceil((74 / width) * 1000));
      genusLayer.transform.find((item) => item.filter).filter =
        `datum.level === 'genus' && datum.x1 - datum.x0 > ${minWidth} && datum.y1 - datum.y0 > 45`;
    }
    if (familyLayer) {
      const minWidth = Math.max(210, Math.ceil((145 / width) * 1000));
      familyLayer.transform.find((item) => item.filter).filter =
        `datum.level === 'family' && datum.x1 - datum.x0 > ${minWidth} && datum.y1 - datum.y0 > 75`;
    }
  }

  return adapted;
}
