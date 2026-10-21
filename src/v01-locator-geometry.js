function validateLocatorView(view) {
  const { longitude, latitude } = view.bounds ?? {};
  const locator = view.locator ?? {};
  const labelAnchor = locator.label_anchor ?? {};
  if (
    !Array.isArray(longitude) || longitude.length !== 2 ||
    !Array.isArray(latitude) || latitude.length !== 2 ||
    !Number.isFinite(longitude[0]) || !Number.isFinite(longitude[1]) ||
    !Number.isFinite(latitude[0]) || !Number.isFinite(latitude[1]) ||
    longitude[0] < -180 || longitude[1] > 180 ||
    latitude[0] < -90 || latitude[1] > 90 ||
    longitude[0] >= longitude[1] || latitude[0] >= latitude[1]
  ) {
    throw new Error(`${view.id} has invalid geographic bounds for its locator.`);
  }
  if (
    !locator.id || !locator.label || !Number.isFinite(labelAnchor.longitude) || !Number.isFinite(labelAnchor.latitude) ||
    !["left", "right"].includes(locator.label_align)
  ) {
    throw new Error(`${view.id} has an incomplete locator label or anchor.`);
  }
  const labelInsideBounds =
    labelAnchor.longitude >= longitude[0] && labelAnchor.longitude <= longitude[1] &&
    labelAnchor.latitude >= latitude[0] && labelAnchor.latitude <= latitude[1];
  if (labelInsideBounds) throw new Error(`${view.id} locator label anchor must sit outside its selected window.`);
}

export function buildV01LocatorGeoJSON(regionalMaps) {
  if (!Array.isArray(regionalMaps) || regionalMaps.length !== 2) {
    throw new Error("V01 requires exactly two regional locator views.");
  }

  const seenIds = new Set();
  const features = [];
  for (const view of regionalMaps) {
    validateLocatorView(view);
    const locator = view.locator;
    if (seenIds.has(locator.id)) throw new Error(`V01 locator ID ${locator.id} is duplicated.`);
    seenIds.add(locator.id);

    const [west, east] = view.bounds.longitude;
    const [south, north] = view.bounds.latitude;
    const centre = [(west + east) / 2, (south + north) / 2];
    const labelAnchor = [locator.label_anchor.longitude, locator.label_anchor.latitude];
    const properties = {
      locator_id: locator.id,
      source_view_id: view.id,
      label: locator.label,
      bounds: structuredClone(view.bounds),
    };

    features.push({
      type: "Feature",
      id: `${locator.id}-anchor`,
      properties: { ...properties, kind: "anchor", longitude: centre[0], latitude: centre[1] },
      geometry: { type: "Point", coordinates: centre },
    });
    features.push({
      type: "Feature",
      id: `${locator.id}-leader`,
      properties: { ...properties, kind: "leader" },
      geometry: { type: "LineString", coordinates: [centre, labelAnchor] },
    });
    features.push({
      type: "Feature",
      id: `${locator.id}-label`,
      properties: {
        ...properties,
        kind: "label",
        place_label: locator.label,
        label_align: locator.label_align,
        longitude: labelAnchor[0],
        latitude: labelAnchor[1],
      },
      geometry: { type: "Point", coordinates: labelAnchor },
    });
  }

  return { type: "FeatureCollection", features };
}
