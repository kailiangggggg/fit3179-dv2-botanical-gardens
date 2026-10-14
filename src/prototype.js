import "@fontsource/fraunces/latin-600.css";
import "@fontsource/fraunces/latin-600-italic.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "./site.css";

import embed from "vega-embed";

const chart = document.querySelector("#facility-map");
chart.replaceChildren();

function localizeDataUrls(value, specUrl) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => localizeDataUrls(item, specUrl));
    return;
  }
  if (value.data && typeof value.data.url === "string") {
    value.data.url = new URL(value.data.url, specUrl).href;
  }
  Object.values(value).forEach((child) => localizeDataUrls(child, specUrl));
}

async function mountPreview() {
  const specUrl = new URL("./specs/V01-facility-symbol-map.json", document.baseURI);
  const response = await fetch(specUrl);
  if (!response.ok) throw new Error(`Chart specification returned ${response.status}`);
  const spec = await response.json();
  localizeDataUrls(spec, specUrl);
  spec.width = Math.max(320, Math.floor(chart.clientWidth));

  const result = await embed(chart, spec, {
    actions: false,
    renderer: "svg",
    config: {
      font: "Source Sans 3",
      axis: {
        labelFont: "Source Sans 3",
        titleFont: "Source Sans 3",
        labelColor: "#526259",
        titleColor: "#34443a",
        domainColor: "#c6cec7",
        tickColor: "#c6cec7",
        gridColor: "#e7e6de"
      },
      legend: {
        labelFont: "Source Sans 3",
        titleFont: "Source Sans 3",
        labelColor: "#526259",
        titleColor: "#34443a"
      },
      view: { stroke: null }
    }
  });

  let previousWidth = spec.width;
  const resize = async () => {
    const width = Math.max(320, Math.floor(chart.clientWidth));
    if (width === previousWidth) return;
    previousWidth = width;
    await result.view.width(width).runAsync();
  };
  new ResizeObserver(resize).observe(chart);
  await result.view.runAsync();
  chart.classList.add("chart-ready");
}

mountPreview().catch((error) => {
  chart.classList.add("chart-error");
  chart.innerHTML = "<p class='chart-error-message'>The register map could not load. See the project validation log.</p>";
  console.error("V01 preview failed to embed", error);
});
