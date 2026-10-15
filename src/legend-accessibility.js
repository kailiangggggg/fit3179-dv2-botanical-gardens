export function isLegendActivationKey(key) {
  return key === "Enter" || key === " ";
}

export function formatLegendActionName(label) {
  return `Filter ranking lines to ${label.trim()}`;
}

export function toggleLegendSelection(activeLabels, label) {
  const next = new Set(activeLabels);
  if (next.has(label)) next.delete(label);
  else next.add(label);
  return next;
}
