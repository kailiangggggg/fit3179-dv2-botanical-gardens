import "@fontsource/fraunces/latin-600.css";
import "@fontsource/fraunces/latin-600-italic.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "./site.css";

import { renderPage } from "./content-renderer.js";
import { adaptChartSpec, localizeDataUrls, resolveChartSpecUrl, shouldRenderV01SupportViews } from "./chart-runtime.js";
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

function setSupportChartError(mount, supportView, error) {
  console.error(`${supportView.id} failed to render`, error);
  const message = document.createElement("p");
  message.className = "chart-error-message";
  message.setAttribute("role", "alert");
  message.textContent = `${supportView.title} could not be rendered.`;
  mount.replaceChildren(message);
  mount.classList.add("chart-support-error");
  mount.setAttribute("aria-busy", "false");
}

function reserveV01SupportHeight(mount, supportView, availableWidth) {
  const width = Math.max(240, Math.floor(availableWidth) || 240);
  const chartWidth = Math.max(280, width);
  const scale = Math.min(1, width / chartWidth);
  if (supportView.id === "V01-AREA") {
    const chartHeight = width < 480 ? 360 : width < 850 ? 260 : 180;
    mount.style.minHeight = `${Math.ceil((chartHeight + 45) * scale)}px`;
    return;
  }
  const regionCount = supportView.name === "Sydney" ? 14 : 18;
  const narrow = width < 400;
  const mapWidth = narrow ? Math.max(240, width - 8) : width < 760 ? 150 : 240;
  const mapHeight = narrow ? Math.max(220, Math.min(265, Math.round(mapWidth * 0.86))) : 300;
  const profileHeight = narrow ? regionCount * 16 + 42 : width < 760 ? 360 : 300;
  const contentHeight = narrow ? mapHeight + profileHeight + 55 : Math.max(mapHeight, profileHeight) + 44;
  mount.style.minHeight = `${Math.ceil(contentHeight * scale)}px`;
}

async function renderV01SupportCharts(figure, chart, embed, facilityFeatures, profileFeatures) {
  const supportViews = [
    ...chart.support_views.regional.maps,
    chart.support_views.quantitative,
  ];

  await Promise.all(supportViews.map(async (supportView) => {
    const mount = figure.querySelector(`#chart-mount-${supportView.id}`);
    reserveV01SupportHeight(mount, supportView, mount.clientWidth);
    const specUrl = resolveChartSpecUrl(supportView.spec, siteBaseUrl);
    const sourceSpec = localizeDataUrls(await fetchJson(specUrl, supportView.id), specUrl);
    let activeView;
    let activeWidth = 0;
    let requestedWidth;
    let rendering = false;

    async function renderAtWidth(availableWidth, force = false) {
      requestedWidth = { width: Math.max(240, Math.floor(availableWidth)), force };
      if (rendering) return;
      rendering = true;

      while (requestedWidth) {
        const { width, force: forceRender } = requestedWidth;
        requestedWidth = undefined;
        if (activeView && !forceRender && Math.abs(width - activeWidth) < 32) continue;
        activeView?.finalize();
        activeView = undefined;
        mount.replaceChildren();
        mount.setAttribute("aria-busy", "true");

        try {
          const viewForAdaptation = supportView.id === "V01-AREA"
            ? supportView
            : { ...supportView, area_scale: chart.support_views.regional.area_scale };
          const spec = adaptChartSpec(sourceSpec, supportView.id, width, facilityFeatures, profileFeatures, viewForAdaptation);
          const dimensions = estimateSpecDimensions(spec);
          const totalSpecWidth = supportView.id === "V01-AREA" ? spec.width + 118 : dimensions.width + 4;
          const displayScale = Math.min(1, mount.clientWidth / totalSpecWidth);
          const embedExtraHeight = supportView.id === "V01-AREA" ? 45 : 44;
          mount.style.minHeight = `${Math.ceil((dimensions.height + embedExtraHeight) * displayScale)}px`;
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
          mount.setAttribute("aria-busy", "false");
          mount.classList.add("support-ready");
        } catch (error) {
          setSupportChartError(mount, supportView, error);
        }
      }

      rendering = false;
    }

    await renderAtWidth(mount.clientWidth, true);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(([entry]) => {
        renderAtWidth(entry.contentRect.width);
      });
      observer.observe(mount);
    }
  }));
}

async function renderChart(figure, chart, registerChartView) {
  const mount = figure.querySelector(".chart-frame");
  const specUrl = resolveChartSpecUrl(chart.spec, siteBaseUrl);
  const sourceSpec = localizeDataUrls(await fetchJson(specUrl, chart.id), specUrl);
  let facilityFeatures;
  let profileFeatures;
  if (shouldRenderV01SupportViews(chart)) {
    const pointsPath = chart.data_files.find((dataPath) => dataPath.endsWith("facility_points.geojson"));
    const collection = await fetchJson(new URL(pointsPath, siteBaseUrl), "V01 facility points");
    facilityFeatures = collection.features;
    const profilePath = chart.support_views.regional.profile_data_file;
    const profileCollection = await fetchJson(new URL(profilePath, siteBaseUrl), "V01 regional profile data");
    profileFeatures = profileCollection.features;
  }
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
        const spec = adaptChartSpec(sourceSpec, chart.id, width, facilityFeatures);
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
          statusText: "The ranking chart is filtered by its legend; the rate map shows all jurisdictions.",
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
  if (shouldRenderV01SupportViews(chart)) {
    await renderV01SupportCharts(figure, chart, embed, facilityFeatures, profileFeatures);
  }
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
    const manifestUrl = new URL("specs/chart-manifest.json", siteBaseUrl);
    const manifest = await fetchJson(manifestUrl, "Chart manifest");
    const rendered = renderPage(storyRoot, navigation, manifest, siteBaseUrl);
    storyRoot.querySelector(".hero").after(sectionRail);
    sectionRail.classList.add("is-ready");
    if (rendered.figures.length !== manifest.charts.length) {
      throw new Error("The rendered chart groups do not match the chart manifest.");
    }

    const chartById = new Map(manifest.charts.map((chart) => [chart.id, chart]));
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
    message.textContent = "The story could not load. Please reload this page or open the public chart manifest and source files.";
    storyRoot.replaceChildren(message);
  }
}

startStory();
