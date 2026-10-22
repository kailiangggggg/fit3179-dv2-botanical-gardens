import { pageStory } from "./site-content.js";
import { shouldRenderV01SupportViews } from "./chart-runtime.js";

function element(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function localLink(href, label, download = false) {
  const link = element("a", "asset-link", label);
  link.href = href;
  if (download) link.download = "";
  return link;
}

function externalLink(href, label) {
  const link = element("a", "source-link", label);
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function renderNavigation(list, navigationItems) {
  list.replaceChildren();
  return navigationItems.map((navItem, index) => {
    const listItem = element("li", index === 0 ? "active" : "");
    const link = element("a");
    link.href = navItem.href;
    link.dataset.sectionLink = navItem.href.slice(1);
    if (index === 0) link.setAttribute("aria-current", "location");

    link.append(
      element("span", "nav-index", navItem.index),
      element("span", "nav-label", navItem.label),
    );
    listItem.append(link);
    list.append(listItem);
    return link;
  });
}

function renderHero(story) {
  const section = element("section", "hero");
  section.setAttribute("aria-labelledby", "page-title");

  const kicker = element("div", "hero-kicker");
  kicker.append(
    element("span", "", story.hero.kicker),
    element("span", "kicker-line"),
    element("span", "", `DATA SNAPSHOT · ${story.snapshot.toUpperCase()}`),
  );

  const heading = element("h1");
  heading.id = "page-title";
  const [firstLine, secondLine] = story.hero.titleLines;
  heading.append(document.createTextNode(firstLine), document.createElement("br"));
  const emphasis = element("em", "", secondLine);
  heading.append(emphasis);

  const subtitle = element("p", "hero-subtitle", story.subtitle);
  const copyGrid = element("div", "hero-copy-grid");
  copyGrid.append(
    element("p", "hero-lede", story.hero.lede),
    element("p", "hero-limit", story.hero.limitation),
  );

  const metrics = element("div", "metric-strip");
  metrics.setAttribute("aria-label", "Geoscience Australia register summary");
  for (const metric of story.metrics) {
    const block = element("div", "metric");
    block.append(element("strong", "", metric.value), element("span", "", metric.label));
    metrics.append(block);
  }
  metrics.append(element("div", "metric-source", "GEOSCIENCE AUSTRALIA\nREGISTER · 2026 SNAPSHOT"));

  section.append(kicker, heading, subtitle, copyGrid, metrics);
  return section;
}

function renderChartNotes(chart) {
  const details = element("details", "chart-notes");
  const summary = element("summary", "", "Source, method and limits");
  details.append(summary);

  const list = element("dl", "chart-contract");
  const items = [
    ["Source", chart.what.source.join("; ")],
    ["Record grain", chart.what.grain],
    ["Measure", chart.what.measure],
    ["Reader task", chart.why.reader_task],
    ["How to read", `${chart.how.marks} ${chart.how.channels} ${chart.how.annotation}`],
  ];

  for (const [label, value] of items) {
    list.append(element("dt", "", label), element("dd", "", value));
  }
  details.append(list);
  return details;
}

function renderSupportMount(id, title, label) {
  const mount = element("div", "chart-support-frame");
  mount.id = `chart-mount-${id}`;
  mount.dataset.supportChartId = id;
  mount.setAttribute("role", "group");
  mount.setAttribute("aria-label", label);
  mount.setAttribute("aria-busy", "true");
  const loading = element("p", "chart-loading", `Loading ${title}…`);
  loading.setAttribute("role", "status");
  mount.append(loading);
  return mount;
}

function formatRegionalWindow(bounds) {
  const [west, east] = bounds.longitude;
  const [south, north] = bounds.latitude;
  return `Window ${west.toFixed(2)}–${east.toFixed(2)}° E · ${Math.abs(north).toFixed(2)}–${Math.abs(south).toFixed(2)}° S. Original coordinates are unchanged.`;
}

function renderV01DensityKey(density) {
  const key = element("div", "v01-density-key");
  key.setAttribute("aria-label", "National density map legend and method");
  const title = element("p", "v01-density-key-title", density.title);
  const items = element("div", "v01-density-key-items");

  for (const contour of density.contours) {
    const item = element("span", "v01-density-key-item");
    const line = element("span", "v01-density-key-line");
    line.style.borderColor = contour.color;
    line.setAttribute("aria-hidden", "true");
    item.append(line, element("span", "", contour.label));
    items.append(item);
  }

  for (const type of density.site_types ?? []) {
    const item = element("span", "v01-density-key-item");
    const dot = element("span", "v01-density-key-dot");
    dot.style.backgroundColor = type.color;
    dot.setAttribute("aria-hidden", "true");
    item.append(dot, element("span", "", type.label));
    items.append(item);
  }

  if (density.exception_mark) {
    const item = element("span", "v01-density-key-item");
    const dot = element("span", "v01-density-key-dot is-hollow");
    dot.setAttribute("aria-hidden", "true");
    item.append(dot, element("span", "", density.exception_mark.label));
    items.append(item);
  }

  key.append(title, items, element("p", "v01-density-key-note", density.note));
  return key;
}

function renderV01SupportViews(supportViews) {
  const support = element("div", "v01-support");
  support.setAttribute("aria-label", "V01 linked regional profiles and smaller-area comparison");

  const regionalSection = element("section", "v01-support-section");
  regionalSection.setAttribute("aria-labelledby", "v01-regional-title");
  const regionalTitle = element("h4", "v01-support-title", supportViews.regional.title);
  regionalTitle.id = "v01-regional-title";
  regionalSection.append(regionalTitle, element("p", "v01-support-dek", supportViews.regional.description));
  const grid = element("div", "v01-region-grid");

  for (const view of supportViews.regional.maps) {
    const panel = element("section", "v01-region-panel");
    panel.dataset.region = view.name;
    panel.setAttribute("aria-labelledby", `${view.id}-title`);
    const heading = element("h5", "v01-region-heading");
    heading.id = `${view.id}-title`;
    heading.setAttribute("aria-label", view.title);
    const locatorBadge = element("span", "v01-locator-badge", view.locator.id);
    locatorBadge.setAttribute("aria-hidden", "true");
    const locatorTitle = view.title.replace(/^[A-Z]\s+—\s+/, "");
    heading.append(locatorBadge, element("span", "", locatorTitle));
    const meta = element("p", "v01-region-meta", formatRegionalWindow(view.bounds));
    panel.append(heading, meta, renderSupportMount(
      view.id,
      view.name + " linked location–area profile",
      view.locator.label + " linked location and registered-area profile; repeats existing national-map facilities. Original coordinates are unchanged. " + formatRegionalWindow(view.bounds),
    ));
    grid.append(panel);
  }
  regionalSection.append(grid);

  const quantitativeSection = element("section", "v01-support-section");
  quantitativeSection.setAttribute("aria-labelledby", "v01-area-title");
  const quantitativeTitle = element("h4", "v01-support-title", supportViews.quantitative.title);
  quantitativeTitle.id = "v01-area-title";
  const quantitativeDescription = element("p", "v01-support-dek", supportViews.quantitative.description);
  const quantitativeMount = renderSupportMount(
    supportViews.quantitative.id,
    "under-100-hectare comparison",
    "Linear comparison of reported hectares for all eligible facilities below 100 hectares, grouped by register type.",
  );
  const quantitativeAnnotation = element("p", "v01-quant-note", supportViews.quantitative.annotation);
  quantitativeSection.append(quantitativeTitle, quantitativeDescription, quantitativeMount, quantitativeAnnotation);

  support.append(regionalSection, quantitativeSection);
  return support;
}

function renderChartEntry(chart, baseUrl) {
  const article = element("article", "chart-entry");
  article.dataset.chartId = chart.id;

  const figure = element("figure", "figure-shell");
  figure.setAttribute("aria-labelledby", `chart-title-${chart.id}`);
  const topLine = element("div", "figure-topline");
  const titleGroup = element("div");
  titleGroup.append(
    element("p", "figure-label", `${chart.id} · ${chart.idiom.toUpperCase()}`),
    element("h3", "", chart.title),
  );
  titleGroup.lastChild.id = `chart-title-${chart.id}`;

  const unit = element(
    "p",
    "figure-unit",
    chart.id === "V05" ? "PAIRED PANELS · ONE CHART GROUP" : `CHART GROUP · ${chart.id}`,
  );
  topLine.append(titleGroup, unit);

  const mount = element("div", "chart-frame");
  mount.id = `chart-mount-${chart.id}`;
  mount.dataset.chartId = chart.id;
  mount.setAttribute("role", "group");
  mount.setAttribute("aria-label", `${chart.title} Vega-Lite visualization`);
  mount.append(element("p", "chart-loading", `Loading ${chart.id}…`));

  const caption = element("figcaption", "figure-caption");
  caption.append(element("span", "caption-mark", "↳"), element("span", "", chart.how.annotation));
  figure.append(topLine, mount);
  if (shouldRenderV01SupportViews(chart) && chart.support_views?.density) figure.append(renderV01DensityKey(chart.support_views.density));
  if (shouldRenderV01SupportViews(chart)) figure.append(renderV01SupportViews(chart.support_views));
  figure.append(caption);

  const actions = element("div", "figure-actions");
  const specUrl = new URL(chart.spec, baseUrl);
  actions.append(localLink(specUrl.href, "Open Vega-Lite specification"));
  for (const supportView of (shouldRenderV01SupportViews(chart) ? chart.support_views?.regional.maps ?? [] : [])) {
    const viewUrl = new URL(supportView.spec, baseUrl);
    actions.append(localLink(viewUrl.href, `Open ${supportView.name} detail specification`));
  }
  if (shouldRenderV01SupportViews(chart) && chart.support_views?.quantitative) {
    const viewUrl = new URL(chart.support_views.quantitative.spec, baseUrl);
    actions.append(localLink(viewUrl.href, "Open under-100-ha specification"));
  }
  for (const dataPath of chart.data_files) {
    const dataUrl = new URL(dataPath, baseUrl);
    const fileName = dataPath.split("/").at(-1);
    actions.append(localLink(dataUrl.href, `Download ${fileName}`, true));
  }

  article.append(figure, renderChartNotes(chart), actions);
  return article;
}

function renderChartTransition(transition) {
  const className = transition.emphasis
    ? "chart-transition chart-transition--lead"
    : "chart-transition";
  const paragraph = element("p", className, transition.text);
  paragraph.dataset.afterChart = transition.afterChart;
  return paragraph;
}

function renderJurisdictionControl() {
  const fieldset = element("fieldset", "linked-state-control");
  fieldset.append(element("legend", "", "Compare the same jurisdiction"));
  const label = element("label", "", "Highlight on the rate map and ranking chart");
  label.htmlFor = "jurisdiction-focus";

  const select = element("select");
  select.id = "jurisdiction-focus";
  select.setAttribute("aria-describedby", "jurisdiction-focus-help");
  const allOption = element("option", "", "All jurisdictions");
  allOption.value = "";
  select.append(allOption);
  for (const jurisdiction of pageStory.jurisdictions) {
    const option = element("option", "", jurisdiction);
    option.value = jurisdiction;
    select.append(option);
  }

  const help = element("p", "linked-state-help", "Choose a jurisdiction to highlight both views. Press Enter or Space on a legend label to filter rank lines; choose All jurisdictions to clear the filter.");
  help.id = "jurisdiction-focus-help";
  const status = element("span", "linked-state-status", "Showing all jurisdictions.");
  status.id = "jurisdiction-focus-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  fieldset.append(label, select, help, status);
  return fieldset;
}

function renderSection(section, chartsById, baseUrl) {
  const wrapper = element("section", "story-section");
  wrapper.id = section.id;
  wrapper.setAttribute("aria-labelledby", `${section.id}-title`);

  const header = element("header", "section-heading");
  const index = element("div", "section-index");
  index.append(
    element("span", "", section.index),
    element("i"),
    element("span", "", section.eyebrow),
  );

  const titleRow = element("div", "section-title-row");
  const titleBlock = element("div");
  const title = element("h2", "", section.title);
  title.id = `${section.id}-title`;
  titleBlock.append(title, element("p", "section-question", section.question));
  const chartRange = section.chartIds.length
    ? `${section.chartIds[0]}–${section.chartIds.at(-1)} / 13`
    : "CLOSING NOTE";
  titleRow.append(titleBlock, element("span", "chart-id", chartRange));
  header.append(index, titleRow);

  const intro = element("p", "section-intro", section.intro);
  const lead = element("div", "section-copy");
  lead.append(element("p", "", section.paragraphs[0]));

  const charts = element("div", "chart-stack");
  for (const chartId of section.chartIds) {
    if (chartId === "V03") charts.append(renderJurisdictionControl());
    const chart = chartsById.get(chartId);
    if (chart) {
      charts.append(renderChartEntry(chart, baseUrl));
      const transition = section.chartTransitions?.find(({ afterChart }) => afterChart === chartId);
      if (transition) charts.append(renderChartTransition(transition));
    }
  }

  const close = element("div", "section-copy section-copy-after");
  for (const paragraph of section.paragraphs.slice(1)) {
    close.append(element("p", "", paragraph));
  }

  wrapper.append(header, intro, lead);
  if (section.id === "evidence") {
    const takeawayBlock = element("aside", "takeaway-rail");
    takeawayBlock.setAttribute("aria-labelledby", "takeaway-title");
    takeawayBlock.append(element("h3", "", "Three things to carry forward"));
    takeawayBlock.lastChild.id = "takeaway-title";
    const takeaways = element("ol", "takeaway-list");
    for (const item of pageStory.takeaways) takeaways.append(element("li", "", item));
    takeawayBlock.append(takeaways);
    wrapper.append(takeawayBlock);
  }
  if (section.chartIds.length) wrapper.append(charts);
  if (close.childElementCount) wrapper.append(close);
  wrapper.append(element("p", "section-transition", section.transition));
  return wrapper;
}

function renderSources(story) {
  const footer = element("footer", "sources-footer");
  footer.id = "sources";
  footer.setAttribute("aria-labelledby", "sources-title");
  const heading = element("h2", "", "Sources, licences and notes");
  heading.id = "sources-title";
  footer.append(heading);

  const details = element("details", "source-register");
  details.open = true;
  details.append(element("summary", "", `${story.sources.length} cited sources and resource archives`));
  const list = element("ul", "source-list");
  for (const source of story.sources) {
    const item = element("li", "source-item");
    const publisher = element("span", "source-publisher", source.publisher);
    item.append(externalLink(source.url, source.label), publisher, element("p", "source-license", source.license));
    list.append(item);
  }
  details.append(list);

  const reuseNote = element("p", "source-reuse-note");
  reuseNote.textContent =
    "The Victorian Conservation Seed Bank archive (ALA dr21987, CC BY-NC 3.0 AU) and the BGANZ workbook are excluded. Public ALA map cells are aggregated to 100 km and cells below five records are suppressed.";
  const author = element("p", "author-note");
  author.textContent = `FIT3179 Data Visualisation 2 · Topic 7 · Snapshot ${story.snapshot} · Kai Liang Chong · Published on GitHub as @kailiangggggg`;

  footer.append(details, reuseNote, author);
  return footer;
}

export function renderPage(root, navList, manifest, baseUrl) {
  const chartsById = new Map(manifest.charts.map((chart) => [chart.id, chart]));
  const navLinks = renderNavigation(navList, pageStory.navigation);
  const children = [renderHero(pageStory)];

  for (const section of pageStory.sections) {
    children.push(renderSection(section, chartsById, baseUrl));
  }
  children.push(renderSources(pageStory));
  root.replaceChildren(...children);
  root.removeAttribute("aria-busy");

  return {
    navLinks,
    sections: [...root.querySelectorAll(".story-section")],
    figures: [...root.querySelectorAll(".chart-entry")],
  };
}
