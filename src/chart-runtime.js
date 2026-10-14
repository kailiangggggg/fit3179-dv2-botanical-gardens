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

export function adaptChartSpec(spec, chartId, availableWidth) {
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

  if (chartId === "V04" && width < 560 && adapted.encoding?.x?.axis) {
    adapted.encoding.x.axis.values = [0.5, 5, 50, 500, 5000];
  }

  if (chartId === "V06") {
    const labelLayer = adapted.layer?.find((layer) => layer.mark?.type === "text");
    const filter = labelLayer?.transform?.find((transform) => transform.filter)?.filter;
    if (filter) {
      const minTileWidth = Math.max(85, Math.ceil((60 / width) * 1000));
      labelLayer.transform.find((transform) => transform.filter).filter =
        `datum.x1 - datum.x0 > ${minTileWidth} && datum.y1 - datum.y0 > 34`;
    }
  }

  return adapted;
}
