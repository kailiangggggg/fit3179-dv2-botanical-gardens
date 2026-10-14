export function isLegendActivationKey(key) {
  return key === "Enter" || key === " ";
}

export function formatLegendActionName(label) {
  return `Filter ranking lines to ${label.trim()}`;
}
