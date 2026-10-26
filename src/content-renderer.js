import { chartAbbreviationCodes, pageStory, regionAbbreviations } from "./site-content.js";

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
    ["Source", chart.source.join("; ")],
    ["Record grain", chart.grain],
    ["Measure", chart.measure],
    ["Reader task", chart.readerTask],
    ["How to read", `${chart.marks} ${chart.channels} ${chart.annotation}`],
  ];

  for (const [label, value] of items) {
    list.append(element("dt", "", label), element("dd", "", value));
  }
  details.append(list);
  return details;
}

function renderAbbreviationKey(chart) {
  const codes = chartAbbreviationCodes[chart.id];
  if (!codes?.length) return null;

  const key = element("div", "abbreviation-key");
  key.setAttribute("role", "group");
  key.setAttribute("aria-label", "State and territory abbreviations");
  const heading = element("p", "abbreviation-key-title", "State and territory abbreviations");
  const list = element("dl", "abbreviation-key-list");
  for (const code of codes) {
    const pair = element("div", "abbreviation-key-pair");
    pair.append(element("dt", "", code), element("dd", "", regionAbbreviations[code]));
    list.append(pair);
  }
  key.append(heading, list);
  return key;
}

function renderChartEntry(chart, baseUrl, transition) {
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
  caption.append(element("span", "caption-mark", "↳"), element("span", "", chart.annotation));
  figure.append(topLine, mount);
  const abbreviationKey = renderAbbreviationKey(chart);
  if (abbreviationKey) figure.append(abbreviationKey);
  figure.append(caption);

  const actions = element("div", "figure-actions");
  const specUrl = new URL(chart.spec, baseUrl);
  actions.append(localLink(specUrl.href, "Open Vega-Lite specification"));
  for (const dataPath of chart.data_files) {
    const dataUrl = new URL(dataPath, baseUrl);
    const fileName = dataPath.split("/").at(-1);
    actions.append(localLink(dataUrl.href, `Download ${fileName}`, true));
  }

  article.append(figure);
  if (transition) article.append(renderChartTransition(transition));
  article.append(renderChartNotes(chart), actions);
  return article;
}

function renderChartTransition(transition) {
  const className = transition.emphasis
    ? "chart-transition chart-transition--lead"
    : "chart-transition";
  const paragraph = element("p", className);
  paragraph.dataset.afterChart = transition.afterChart;
  paragraph.append(
    element("strong", "chart-transition-label", "What this tells us"),
    element("span", "chart-transition-copy", transition.text),
  );
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
      const transition = section.chartTransitions?.find(({ afterChart }) => afterChart === chartId);
      charts.append(renderChartEntry(chart, baseUrl, transition));
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

export function renderPage(root, navList, chartCards, baseUrl) {
  const chartsById = new Map(chartCards.map((chart) => [chart.id, chart]));
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
