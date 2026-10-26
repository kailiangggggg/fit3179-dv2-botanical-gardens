import "@fontsource/fraunces/latin-600.css";
import "@fontsource/fraunces/latin-600-italic.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "./site.css";

import { renderPage } from "./content-renderer.js";
import { chartCards } from "./site-content.js";
import { adaptChartSpec, localizeDataUrls, resolveChartSpecUrl } from "./chart-runtime.js";
import { formatLegendActionName, isLegendActivationKey, toggleLegendSelection } from "./legend-accessibility.js";
import { getActiveSectionId } from "./navigation-runtime.js";

const storyRoot = document.querySelector("#story-root");
const sectionRail = document.querySelector(".section-rail");
const navigation = document.querySelector("#section-nav");
const siteBaseUrl = new URL("./", document.baseURI);
let embedPromise;
let linkedJurisdiction = null;
const linkedViews = new Map();
const linkedChartResetters = new Map();

async function fetchJson(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  return response.json();
}

function loadVegaEmbed() {
  embedPromise ??= import("vega-embed").then((module) => module.default);
  return embedPromise;
}

function estimateSpecDimensions(spec) {
  if (Array.isArray(spec.hconcat) || Array.isArray(spec.vconcat)) {
    const children = spec.hconcat ?? spec.vconcat;
    const sizes = children.map(estimateSpecDimensions);
    const gap = Number(spec.spacing ?? 12) * Math.max(0, children.length - 1);
    return spec.hconcat
      ? { width: sizes.reduce((sum, size) => sum + size.width, 0) + gap, height: Math.max(...sizes.map((size) => size.height)) }
      : { width: Math.max(...sizes.map((size) => size.width)), height: sizes.reduce((sum, size) => sum + size.height, 0) + gap };
  }
  return {
    width: Number(spec.width ?? 320),
    height: Number(spec.height ?? 220),
  };
}

function setChartError(mount, chart) {
  const message = document.createElement("p");
  message.className = "chart-error-message";
  message.setAttribute("role", "alert");
  message.textContent = `${chart.id} could not be rendered. Use the specification and data links below to inspect this chart.`;
  mount.replaceChildren(message);
  mount.classList.add("chart-error");
  mount.setAttribute("aria-busy", "false");
}

async function renderChart(figure, chart, registerChartView) {
  const mount = figure.querySelector(".chart-frame");
  const specUrl = resolveChartSpecUrl(chart.spec, siteBaseUrl);
  const sourceSpec = localizeDataUrls(await fetchJson(specUrl, chart.id), specUrl);
  const embed = await loadVegaEmbed();
  let activeView;
  let activeWidth = 0;
  let requestedWidth;
  let rendering = false;
  let activeLegendLabels = new Set();

  function updateLegendAccessibility() {
    if (chart.id !== "V03") return;
    for (const label of mount.querySelectorAll("svg .role-legend-label")) {
      const name = label.textContent.trim();
      if (!name) continue;
      label.setAttribute("tabindex", "0");
      label.setAttribute("role", "button");
      label.setAttribute("aria-label", formatLegendActionName(name));
      label.setAttribute("aria-pressed", String(activeLegendLabels.has(name)));
    }
  }

  function legendLabelForTarget(target) {
    const label = target.closest(".role-legend-label");
    if (label) return label.textContent.trim() || null;
    const symbol = target.closest(".role-legend-symbol");
    return symbol?.parentElement?.querySelector(".role-legend-label")?.textContent.trim() ?? null;
  }

  async function renderAtWidth(availableWidth, force = false) {
    requestedWidth = { width: Math.max(240, Math.floor(availableWidth)), force };
    if (rendering) return;
    rendering = true;

    while (requestedWidth) {
      const { width, force: forceRender } = requestedWidth;
      requestedWidth = undefined;
      if (activeView && !forceRender && Math.abs(width - activeWidth) < 32) continue;
      if (activeView) registerChartView(chart.id, undefined);
      if (activeView && chart.id === "V03") activeLegendLabels.clear();
      activeView?.finalize();
      activeView = undefined;
      mount.replaceChildren();
      mount.setAttribute("aria-busy", "true");

      try {
        const spec = adaptChartSpec(sourceSpec, chart.id, width);
        const result = await embed(mount, spec, {
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
              gridColor: "#e7e6de",
            },
            legend: {
              labelFont: "Source Sans 3",
              titleFont: "Source Sans 3",
              labelColor: "#526259",
              titleColor: "#34443a",
            },
            view: { stroke: null },
          },
        });
        await result.view.runAsync();
        activeView = result.view;
        activeWidth = width;
        await registerChartView(chart.id, activeView);
        updateLegendAccessibility();
        mount.setAttribute("aria-busy", "false");
        mount.classList.add("chart-ready");
      } catch (error) {
        console.error(`${chart.id} failed to render`, error);
        setChartError(mount, chart);
      }
    }

    rendering = false;
  }

  registerChartResetter(chart.id, () => {
    activeLegendLabels.clear();
    return renderAtWidth(mount.clientWidth, true);
  });
  if (chart.id === "V03") {
    mount.addEventListener("keydown", (event) => {
      if (!isLegendActivationKey(event.key)) return;
      const label = event.target instanceof Element ? event.target.closest(".role-legend-label") : null;
      if (!label || !mount.contains(label)) return;
      event.preventDefault();
      const clickTarget = label.querySelector("text") ?? label;
      clickTarget.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    });
    mount.addEventListener("click", (event) => {
      if (!(event.target instanceof Element) || !event.target.closest("svg")) return;
      const inLegend = Boolean(event.target.closest(".role-legend-entry"));
      const onMark = Boolean(event.target.closest(".role-mark"));
      if (inLegend) {
        const label = legendLabelForTarget(event.target);
        if (label) {
          activeLegendLabels = toggleLegendSelection(activeLegendLabels, label);
          activeView?.signal("selectedStates", [...activeLegendLabels]);
        }
        setLinkedJurisdiction(null, {
          preserveLegend: true,
          statusText: activeLegendLabels.size
            ? "The ranking chart is filtered by its legend; the rate map shows all jurisdictions."
            : "The ranking chart legend filter is cleared; all jurisdictions are shown.",
        });
        updateLegendAccessibility();
      } else if (!onMark) {
        activeLegendLabels.clear();
        activeView?.signal("selectedStates", []);
        setLinkedJurisdiction(null, {
          preserveLegend: true,
          statusText: "The legend filter is cleared; all jurisdictions are shown.",
        });
        updateLegendAccessibility();
      }
    });
  }

  await renderAtWidth(mount.clientWidth);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(([entry]) => {
      renderAtWidth(entry.contentRect.width);
    });
    observer.observe(mount);
  }
}

function observeSections(sections, navLinks) {
  const items = new Map(navLinks.map((link) => [link.dataset.sectionLink, link]));
  const update = () => {
    const activeId = getActiveSectionId(
      sections.map((section) => ({ id: section.id, top: section.getBoundingClientRect().top })),
      window.innerHeight * 0.3,
    );
    for (const [sectionId, link] of items) {
      const isCurrent = sectionId === activeId;
      link.closest("li").classList.toggle("active", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  };

  let scheduled = false;
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  };

  update();
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  if ("ResizeObserver" in window) {
    new ResizeObserver(scheduleUpdate).observe(document.querySelector(".page-shell"));
  }
}

function registerChartView(chartId, view) {
  if (chartId !== "V02" && chartId !== "V03") return;
  if (!view) {
    linkedViews.delete(chartId);
    return;
  }

  linkedViews.set(chartId, view);
  view.signal("linkedState", linkedJurisdiction);
  return view.runAsync();
}

function registerChartResetter(chartId, resetter) {
  if (chartId !== "V03") return;
  if (resetter) linkedChartResetters.set(chartId, resetter);
  else linkedChartResetters.delete(chartId);
}

function setLinkedJurisdiction(value, options = {}) {
  linkedJurisdiction = value || null;
  if (!options.preserveLegend) linkedChartResetters.get("V03")?.();
  const selector = document.querySelector("#jurisdiction-focus");
  if (selector && selector.value !== (linkedJurisdiction ?? "")) {
    selector.value = linkedJurisdiction ?? "";
  }
  const status = document.querySelector("#jurisdiction-focus-status");
  if (status) {
    status.textContent = options.statusText ?? (linkedJurisdiction
      ? `Highlighting ${linkedJurisdiction} across both charts.`
      : "All jurisdictions shown. Use the ranking chart legend to filter series.");
  }

  for (const view of linkedViews.values()) {
    view.signal("linkedState", linkedJurisdiction);
    view.runAsync().catch((error) => console.error("State highlight could not update", error));
  }
}

function observeCharts(figures, chartById) {
  const mountFigure = (figure) => {
    const chart = chartById.get(figure.dataset.chartId);
    if (!chart) return;
    renderChart(figure, chart, registerChartView, registerChartResetter).catch((error) => {
      console.error(`${chart.id} could not be loaded`, error);
      setChartError(figure.querySelector(".chart-frame"), chart);
    });
  };

  if (!("IntersectionObserver" in window)) {
    figures.forEach(mountFigure);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      mountFigure(entry.target);
    }
  }, { rootMargin: "650px 0px" });

  figures.forEach((figure) => observer.observe(figure));
}

async function startStory() {
  try {
    const rendered = renderPage(storyRoot, navigation, chartCards, siteBaseUrl);
    storyRoot.querySelector(".hero").after(sectionRail);
    sectionRail.classList.add("is-ready");
    if (rendered.figures.length !== chartCards.length) {
      throw new Error("The rendered chart groups do not match the site content.");
    }

    const chartById = new Map(chartCards.map((chart) => [chart.id, chart]));
    document.querySelector("#jurisdiction-focus")?.addEventListener("change", (event) => {
      setLinkedJurisdiction(event.currentTarget.value);
    });
    observeSections(rendered.sections, rendered.navLinks);
    observeCharts(rendered.figures, chartById);
  } catch (error) {
    console.error("The data story could not be loaded", error);
    storyRoot.removeAttribute("aria-busy");
    const message = document.createElement("p");
    message.className = "story-error";
    message.setAttribute("role", "alert");
    message.textContent = "The story could not load. Please reload this page or open the published chart specifications and source files.";
    storyRoot.replaceChildren(message);
  }
}

startStory();
