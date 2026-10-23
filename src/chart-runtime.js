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
