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

function adaptV01RegionSpec(spec, availableWidth) {
  const width = Math.max(240, Math.floor(Number(availableWidth) || 240));
  const chartWidth = Math.max(280, width);
  const adapted = structuredClone(spec);
  adapted.width = chartWidth;
  adapted.height = Math.min(210, Math.max(160, Math.round(chartWidth * 0.62)));
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

export function adaptChartSpec(spec, chartId, availableWidth, facilityFeatures) {
  if (["V01-REGION", "V01-SYD", "V01-MELB"].includes(chartId)) {
    return adaptV01RegionSpec(spec, availableWidth);
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
