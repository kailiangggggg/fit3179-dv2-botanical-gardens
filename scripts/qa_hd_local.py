"""Build-snapshot browser QA. Wait for every Vega chart before capturing evidence."""
import json
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = "http://127.0.0.1:4173/"
OUT = ROOT / "tmp" / "editorial-navigation-20261018" / "full-browser-qa"
OUT.mkdir(parents=True, exist_ok=True)
VIEWPORTS = ((320, 700), (390, 844), (768, 900), (1024, 768), (1280, 800), (1366, 768), (1600, 900))
CHART_IDS = tuple(f"V{i:02}" for i in range(1, 14))


def wait_for_charts(page):
    page.wait_for_function("document.querySelectorAll('.chart-entry').length === 13", timeout=60000)
    figures = page.locator(".chart-entry")
    if figures.count() != 13:
        raise AssertionError(f"expected 13 chart groups, got {figures.count()}")
    mark_counts = {}
    for chart_id in CHART_IDS:
        figure = page.locator(f'.chart-entry[data-chart-id="{chart_id}"]')
        figure.scroll_into_view_if_needed(timeout=30000)
        frame = figure.locator(".chart-frame")
        frame.wait_for(state="visible", timeout=30000)
        page.wait_for_function(
            '(el) => el.classList.contains("chart-ready") || el.classList.contains("chart-error")',
            arg=frame.element_handle(),
            timeout=30000,
        )
        if "chart-error" in (frame.get_attribute("class") or ""):
            raise AssertionError(f"{chart_id} rendered an error state")
        if frame.locator("svg").count() != 1:
            raise AssertionError(f"{chart_id} did not render exactly one SVG")
        if chart_id == "V02" and frame.bounding_box()["height"] > 560:
            raise AssertionError(f"V02 choropleth frame is too tall: {frame.bounding_box()}")
        if chart_id == "V04":
            label = frame.locator('.role-axis-label text:text-is("Botanic Garden")')
            if label.count() != 1:
                raise AssertionError("V04 Botanic Garden axis label is missing")
            label_box = label.bounding_box()
            svg_box = frame.locator("svg").bounding_box()
            if not label_box or not svg_box or label_box["x"] < svg_box["x"]:
                raise AssertionError(f"V04 Botanic Garden label is clipped: label={label_box}, svg={svg_box}")
        mark_counts[chart_id] = frame.locator("svg .role-mark").count()
        if not mark_counts[chart_id]:
            raise AssertionError(f"{chart_id} rendered no marks")
        if chart_id == "V03":
            abbreviations = frame.locator("svg text").evaluate_all(
                "nodes => nodes.map((node) => node.textContent.trim()).filter((text) => /^(NSW|VIC|QLD|WA|SA|ACT|NT|TAS)$/.test(text))"
            )
            if len(set(abbreviations)) != 8:
                raise AssertionError(f"V03 is missing direct rate-rank endpoint labels: {abbreviations}")
    return mark_counts


EXPECTED_CHAPTERS = [
    "A national footprint",
    "Inside the collections",
    "Beyond the garden gate",
    "What the evidence means",
]
EXPECTED_CHART_TRANSITIONS = ["V01", "V02", "V03", "V05", "V06", "V07", "V08", "V10", "V11", "V12"]


def check_navigation_layout(page, width):
    page.wait_for_function("document.querySelectorAll('#section-nav a').length === 4", timeout=30000)
    result = page.evaluate("""() => {
      const rail = document.querySelector('.section-rail');
      const list = document.querySelector('#section-nav');
      const hero = document.querySelector('.hero');
      const links = [...list.querySelectorAll('a')];
      const sectionIds = new Set([...document.querySelectorAll('.story-section')].map(section => section.id));
      const railRect = rail.getBoundingClientRect();
      return {
        labels: links.map(link => link.querySelector('.nav-label').textContent.trim()),
        hrefs: links.map(link => link.getAttribute('href')),
        targetsExist: links.every(link => sectionIds.has(link.getAttribute('href').slice(1))),
        followsHero: hero.nextElementSibling === rail,
        sticky: getComputedStyle(rail).position === 'sticky',
        barHeight: Math.round(railRect.height),
        navDisplay: getComputedStyle(list).display,
        navColumns: getComputedStyle(list).gridTemplateColumns.split(/\\s+/).length,
        chartTransitions: [...document.querySelectorAll('.chart-transition')].map(node => node.dataset.afterChart),
        transitionsInPlace: ["V01", "V02", "V03", "V05", "V06", "V07", "V08", "V10", "V11", "V12"].every(id => {
          const chart = document.querySelector('.chart-entry[data-chart-id="' + id + '"]');
          const next = chart?.nextElementSibling;
          return next?.classList.contains('chart-transition') && next.dataset.afterChart === id && next.textContent.trim().length > 0;
        }),
        documentWidth: document.documentElement.scrollWidth
      };
    }""")
    if result["labels"] != EXPECTED_CHAPTERS:
        raise AssertionError(f"Chapter labels/order changed: {result['labels']}")
    if result["hrefs"] != ["#footprint", "#records", "#origins", "#evidence"] or not result["targetsExist"]:
        raise AssertionError(f"Chapter links no longer target the same page sections: {result}")
    if not result["followsHero"] or not result["sticky"]:
        raise AssertionError(f"Chapter guide is not placed after the hero as a sticky same-page guide: {result}")
    if result["chartTransitions"] != EXPECTED_CHART_TRANSITIONS or not result["transitionsInPlace"]:
        raise AssertionError(f"Chart-to-chart story copy is missing or out of order: {result}")
    expected_columns = 4 if width > 900 else 2
    if result["navDisplay"] != "grid" or result["navColumns"] != expected_columns:
        raise AssertionError(f"Unexpected chapter-guide columns at {width}px: {result}")
    height_limit = 70 if width > 900 else 120
    if result["barHeight"] > height_limit or result["documentWidth"] > width:
        raise AssertionError(f"Chapter guide height/overflow check failed at {width}px: {result}")
    return result


def check_navigation_interactions(page):
    page.emulate_media(reduced_motion="reduce")
    page.evaluate("document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0)")
    keyboard_sequence = []
    for _ in range(12):
        page.keyboard.press("Tab")
        focused = page.evaluate("""() => ({
          section: document.activeElement?.dataset?.sectionLink || null,
          visible: document.activeElement?.matches(':focus-visible') || false,
          outline: getComputedStyle(document.activeElement).outlineStyle
        })""")
        keyboard_sequence.append(focused)
        if focused["section"] == "origins":
            break
    if keyboard_sequence[-1]["section"] != "origins" or not keyboard_sequence[-1]["visible"] or keyboard_sequence[-1]["outline"] == "none":
        raise AssertionError(f"Keyboard focus did not reach the Origins link visibly: {keyboard_sequence}")
    page.keyboard.press("Enter")
    page.wait_for_function("location.hash === '#origins'")
    page.wait_for_function("document.querySelector('a[data-section-link=origins]').getAttribute('aria-current') === 'location'")
    origin_position = page.evaluate("""() => ({
      headingTop: document.querySelector('#origins').getBoundingClientRect().top,
      navBottom: document.querySelector('.section-rail').getBoundingClientRect().bottom,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior
    })""")
    if origin_position["headingTop"] < origin_position["navBottom"] or origin_position["scrollBehavior"] != "auto":
        raise AssertionError(f"Keyboard anchor is obscured or reduced motion is ignored: {origin_position}")

    mouse_anchors = {}
    for section_id in ("records", "footprint", "evidence"):
        page.locator(f'a[data-section-link="{section_id}"]').click()
        page.wait_for_function(f"location.hash === '#{section_id}'")
        page.wait_for_function(
            f"document.querySelector('a[data-section-link={section_id}]').getAttribute('aria-current') === 'location'"
        )
        position = page.evaluate("""id => ({
          headingTop: document.querySelector('#' + id).getBoundingClientRect().top,
          navBottom: document.querySelector('.section-rail').getBoundingClientRect().bottom
        })""", section_id)
        if position["headingTop"] < position["navBottom"]:
            raise AssertionError(f"Mouse anchor is obscured by the chapter guide: {section_id} {position}")
        mouse_anchors[section_id] = position
    return {"keyboardOrigin": origin_position, "mouseAnchors": mouse_anchors, "focus": keyboard_sequence[-1]}


def check_heatmap_label_contrast(page):
    result = page.locator("#chart-mount-V09 svg").evaluate(
        """svg => {
          const relativeLuminance = (color) => {
            const rgb = color.match(/[\\d.]+/g)?.slice(0, 3).map(Number);
            if (!rgb || rgb.length !== 3) return null;
            const linear = rgb.map((value) => {
              const channel = value / 255;
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
          };
          const ratio = (first, second) => {
            const a = relativeLuminance(first), b = relativeLuminance(second);
            if (a === null || b === null) return null;
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          };
          const cells = [...svg.querySelectorAll(".mark-rect path, .mark-rect rect")];
          const labels = [...svg.querySelectorAll(".mark-text text")];
          const measured = labels.map((label) => {
            const box = label.getBoundingClientRect();
            const x = (box.left + box.right) / 2, y = (box.top + box.bottom) / 2;
            const cell = cells.find((candidate) => {
              const rect = candidate.getBoundingClientRect();
              return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
            });
            if (!cell || !/^\\d/.test(label.textContent.trim())) return null;
            const foreground = getComputedStyle(label).fill;
            const background = getComputedStyle(cell).fill;
            return { value: label.textContent.trim(), foreground, background, contrast: ratio(foreground, background) };
          }).filter(Boolean);
          return { count: measured.length, minimum: Math.min(...measured.map((entry) => entry.contrast)), failures: measured.filter((entry) => entry.contrast < 4.5) };
        }"""
    )
    if result["count"] < 50 or result["failures"]:
        raise AssertionError(f"V09 direct-label contrast failed: {json.dumps(result)}")
    return result


def check_treemap_label_contrast(page):
    result = page.locator("#chart-mount-V06 svg").evaluate(
        """svg => {
          const relativeLuminance = (color) => {
            const rgb = color.match(/[\\d.]+/g)?.slice(0, 3).map(Number);
            if (!rgb || rgb.length !== 3) return null;
            const linear = rgb.map((value) => {
              const channel = value / 255;
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
          };
          const ratio = (first, second) => {
            const a = relativeLuminance(first), b = relativeLuminance(second);
            if (a === null || b === null) return null;
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          };
          const cells = [...svg.querySelectorAll(".layer_0_marks path")];
          const labels = [...svg.querySelectorAll(".layer_1_marks text")];
          const measured = labels.map((label) => {
            const box = label.getBoundingClientRect();
            const x = (box.left + box.right) / 2, y = (box.top + box.bottom) / 2;
            const cell = cells.find((candidate) => {
              const rect = candidate.getBoundingClientRect();
              return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
            });
            if (!cell) return { value: label.textContent.trim(), contrast: null };
            const foreground = getComputedStyle(label).fill;
            const background = getComputedStyle(cell).fill;
            return { value: label.textContent.trim(), foreground, background, contrast: ratio(foreground, background) };
          });
          return { count: measured.length, minimum: Math.min(...measured.map((entry) => entry.contrast ?? 0)), failures: measured.filter((entry) => !entry.contrast || entry.contrast < 4.5) };
        }"""
    )
    if result["count"] < 1 or result["failures"]:
        raise AssertionError(f"V06 direct-label contrast failed: {json.dumps(result)}")
    return result


def check_choropleth_label_contrast(page):
    result = page.locator("#chart-mount-V02 svg").evaluate(
        """svg => {
          const names = {NSW:"New South Wales",VIC:"Victoria",QLD:"Queensland",SA:"South Australia",WA:"Western Australia",TAS:"Tasmania",NT:"Northern Territory",ACT:"Australian Capital Territory"};
          const luminance = (color) => {
            const rgb = color.match(/[\\d.]+/g)?.slice(0,3).map(Number);
            if (!rgb || rgb.length !== 3) return null;
            const linear = rgb.map((value) => { const channel=value/255; return channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4; });
            return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
          };
          const ratio = (a,b) => { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
          const shapes=[...svg.querySelectorAll(".layer_1_marks path")];
          const labels=[...svg.querySelectorAll(".layer_2_marks text")];
          const measured=labels.map(label=>{
            const abbreviation=label.textContent.trim(), state=names[abbreviation];
            const shape=shapes.find(path=>(path.getAttribute("aria-label")||"").includes(`Jurisdiction: ${state};`));
            if (!shape) return {abbreviation,contrast:null,missingShape:true};
            const foreground=getComputedStyle(label).fill, background=getComputedStyle(shape).fill;
            return {abbreviation,foreground,background,stroke:getComputedStyle(label).stroke,contrast:ratio(foreground,background)};
          });
          return {count:measured.length,minimum:Math.min(...measured.map(item=>item.contrast??0)),failures:measured.filter(item=>!item.contrast||item.contrast<4.5),labels:measured};
        }"""
    )
    if result["count"] != 8 or result["failures"]:
        raise AssertionError(f"V02 state-label contrast failed: {json.dumps(result)}")
    return result


def check_hexbin_visibility(page):
    result = page.locator("#chart-mount-V10 svg").evaluate(
        """svg => {
          const luminance = (color) => {
            const rgb = color.match(/[\\d.]+/g)?.slice(0,3).map(Number);
            if (!rgb || rgb.length !== 3) return null;
            const linear = rgb.map((value) => { const channel=value/255; return channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4; });
            return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
          };
          const ratio = (a,b) => { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
          const background="rgb(241, 239, 231)";
          const cells=[...svg.querySelectorAll(".layer_1_marks path")].map(path=>{
            const label=path.getAttribute("aria-label")||"";
            const count=Number(label.match(/Origin records per 100 km cell:\\s*([\\d,]+)/)?.[1]?.replaceAll(",",""));
            const fill=getComputedStyle(path).fill;
            return {count,fill,luminance:luminance(fill),contrast:ratio(fill,background)};
          }).filter(cell=>Number.isFinite(cell.count));
          const ordered=cells.slice().sort((a,b)=>a.count-b.count);
          const reversals=ordered.slice(1).filter((cell,index)=>cell.luminance>ordered[index].luminance+0.00001);
          const lightest=cells.reduce((best,cell)=>cell.luminance>best.luminance?cell:best,cells[0]);
          const darkest=cells.reduce((best,cell)=>cell.luminance<best.luminance?cell:best,cells[0]);
          return {count:cells.length,uniqueColors:new Set(cells.map(cell=>cell.fill)).size,lightest,darkest,minimumBackgroundContrast:Math.min(...cells.map(cell=>cell.contrast)),luminanceReversals:reversals.length};
        }"""
    )
    if result["count"] < 500 or result["minimumBackgroundContrast"] < 3 or result["luminanceReversals"]:
        raise AssertionError(f"V10 sequential visibility check failed: {json.dumps(result)}")
    return result


def check_interactions(browser):
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    console_messages = []
    failed_responses = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}") if msg.type in ("warning", "error") else None)
    page.on("pageerror", lambda error: console_messages.append(f"pageerror: {error}"))
    page.on("response", lambda response: failed_responses.append(f"{response.status} {response.url}") if response.status >= 400 else None)
    page.goto(URL, wait_until="domcontentloaded", timeout=30000)
    mark_counts = wait_for_charts(page)
    navigation = check_navigation_interactions(page)

    page.locator('.chart-entry[data-chart-id="V01"]').scroll_into_view_if_needed()
    large_symbol = page.locator('#chart-mount-V01 .layer_1_marks path[aria-label*="Helms Arboretum"]').first
    box = large_symbol.bounding_box()
    if not box or box["width"] < 10 or box["height"] < 10:
        raise AssertionError(f"V01 maximum-area symbol is not visibly targetable: {box}")
    target = {"x": box["x"] + box["width"] / 2, "y": box["y"] + box["height"] / 2}
    hit_label = page.evaluate("point => document.elementFromPoint(point.x, point.y)?.getAttribute('aria-label')", target)
    if not hit_label or "Helms Arboretum" not in hit_label:
        raise AssertionError(f"V01 symbol center is not pointer-targetable: {target}, hit={hit_label}")
    page.mouse.move(target["x"], target["y"])
    page.locator(".vg-tooltip").wait_for(state="visible", timeout=5000)
    tooltip_text = page.locator(".vg-tooltip").inner_text()
    if "Facility" not in tooltip_text:
        raise AssertionError(f"V01 tooltip did not identify the facility: {tooltip_text}")
    page.screenshot(path=str(OUT / "V01-hover-tooltip-1280.png"), animations="disabled")

    selector = page.locator("#jurisdiction-focus")
    selector.select_option(label="Australian Capital Territory")
    page.wait_for_function('document.querySelector("#jurisdiction-focus-status")?.textContent.includes("Australian Capital Territory")')
    focus_opacity = page.evaluate("""() => {
      const opacity = (selector) => {
        const mark = document.querySelector(selector);
        return mark ? Number(getComputedStyle(mark).opacity) : null;
      };
      return {
        mapSelected: opacity('#chart-mount-V02 .layer_1_marks path[aria-label*="Australian Capital Territory"]'),
        mapOther: opacity('#chart-mount-V02 .layer_1_marks path[aria-label*="Victoria"]'),
        rankSelected: opacity('#chart-mount-V03 svg .mark-symbol path[aria-label*="state: Australian Capital Territory"]'),
        rankOther: opacity('#chart-mount-V03 svg .mark-symbol path[aria-label*="state: Victoria"]'),
        rankLabelSelected: opacity('#chart-mount-V03 svg .mark-text text[aria-label*="state_abbreviation: ACT"]'),
        rankLabelOther: opacity('#chart-mount-V03 svg .mark-text text[aria-label*="state_abbreviation: VIC"]')
      };
    }""")
    if (
        focus_opacity["mapSelected"] != 1
        or focus_opacity["rankSelected"] != 1
        or focus_opacity["rankLabelSelected"] != 1
        or focus_opacity["mapOther"] >= 0.2
        or focus_opacity["rankOther"] >= 0.2
        or focus_opacity["rankLabelOther"] >= 0.2
    ):
        raise AssertionError(f"V02/V03 linked jurisdiction focus failed: {focus_opacity}")
    page.locator('.chart-entry[data-chart-id="V02"]').screenshot(
        path=str(OUT / "V02-linked-ACT-1280.png"), animations="disabled"
    )
    page.locator('.chart-entry[data-chart-id="V03"]').screenshot(
        path=str(OUT / "V03-linked-ACT-1280.png"), animations="disabled"
    )
    selector.select_option(label="All jurisdictions")
    page.wait_for_function('document.querySelector("#jurisdiction-focus-status")?.textContent.includes("All jurisdictions")')

    legend = page.locator("#chart-mount-V03 .role-legend-label[role=button]").first
    pointer_legend = page.locator("#chart-mount-V03 .role-legend-label[role=button]").first
    pointer_legend.click(timeout=10000)
    page.wait_for_function('(el) => el.getAttribute("aria-pressed") === "true"', arg=legend.element_handle())
    page.wait_for_function(
        '(() => [...document.querySelectorAll("#chart-mount-V03 svg .mark-text text")].filter((node) => /^(NSW|VIC|QLD|WA|SA|ACT|NT|TAS)$/.test(node.textContent.trim())).length === 1)()'
    )
    page.locator('.chart-entry[data-chart-id="V03"]').screenshot(
        path=str(OUT / "V03-pointer-filter-NSW-1280.png"), animations="disabled"
    )
    pointer_legend.click(timeout=10000)
    page.wait_for_function('(el) => el.getAttribute("aria-pressed") === "false"', arg=legend.element_handle())
    page.wait_for_function(
        '(() => [...document.querySelectorAll("#chart-mount-V03 svg .mark-text text")].filter((node) => /^(NSW|VIC|QLD|WA|SA|ACT|NT|TAS)$/.test(node.textContent.trim())).length === 8)()'
    )
    pointer_filter = legend.get_attribute("aria-label")
    page.locator('.chart-entry[data-chart-id="V03"]').screenshot(
        path=str(OUT / "V03-pointer-reset-1280.png"), animations="disabled"
    )
    legend.focus()
    page.keyboard.press("Space")
    page.wait_for_function('(el) => el.getAttribute("aria-pressed") === "true"', arg=legend.element_handle())
    page.wait_for_function(
        '(() => [...document.querySelectorAll("#chart-mount-V03 svg .mark-text text")].filter((node) => /^(NSW|VIC|QLD|WA|SA|ACT|NT|TAS)$/.test(node.textContent.trim())).length === 1)()'
    )
    space_label = legend.get_attribute("aria-label")
    page.locator('.chart-entry[data-chart-id="V03"]').screenshot(
        path=str(OUT / "V03-keyboard-filter-NSW-1280.png"), animations="disabled"
    )
    page.evaluate("document.activeElement?.blur()")
    selected_legend_style = legend.evaluate("el => { const text = el.querySelector('text'); return { fontWeight: getComputedStyle(text).fontWeight, textDecoration: getComputedStyle(text).textDecorationLine }; }")
    if selected_legend_style["fontWeight"] != "700" or "underline" not in selected_legend_style["textDecoration"]:
        raise AssertionError(f"Selected V03 legend item lacks a visible state: {selected_legend_style}")
    legend.focus()
    legend.press("Enter")
    page.wait_for_function('(el) => el.getAttribute("aria-pressed") === "false"', arg=legend.element_handle())
    page.wait_for_function(
        '(() => [...document.querySelectorAll("#chart-mount-V03 svg .mark-text text")].filter((node) => /^(NSW|VIC|QLD|WA|SA|ACT|NT|TAS)$/.test(node.textContent.trim())).length === 8)()'
    )
    page.locator('.chart-entry[data-chart-id="V03"]').screenshot(
        path=str(OUT / "V03-keyboard-reset-1280.png"), animations="disabled"
    )

    page.evaluate("document.activeElement.blur(); window.scrollTo(0, 0)")
    page.keyboard.press("Tab")
    focus = page.evaluate("""() => ({
      text: document.activeElement?.textContent?.trim(),
      visible: document.activeElement?.matches(":focus-visible"),
      outline: getComputedStyle(document.activeElement).outlineStyle,
      outlineWidth: getComputedStyle(document.activeElement).outlineWidth
    })""")
    if not focus["visible"] or focus["outline"] == "none" or focus["outlineWidth"] == "0px":
        raise AssertionError(f"Keyboard focus indicator is not visible: {focus}")

    fonts = page.evaluate("""async () => {
      await document.fonts.ready;
      return {
        sourceSans: document.fonts.check('16px "Source Sans 3"'),
        fraunces: document.fonts.check('16px Fraunces'),
        sourceLinks: document.querySelectorAll('a[href^="https://"]').length
      };
    }""")
    if not fonts["sourceSans"] or not fonts["fraunces"]:
        raise AssertionError(f"A local typeface did not load: {fonts}")

    result = {"marks": mark_counts, "tooltip": tooltip_text.replace("\n", " | "), "linkedFocus": focus_opacity, "pointerFilter": pointer_filter, "keyboardFilter": space_label, "selectedLegendStyle": selected_legend_style, "focus": focus, "fonts": fonts, "navigation": navigation}
    page.close()
    if console_messages or failed_responses:
        raise AssertionError(f"Browser warnings/errors or failed requests: {console_messages}, {failed_responses}")
    return result


server = subprocess.Popen(
    [sys.executable, "-m", "http.server", "4173", "--bind", "127.0.0.1", "--directory", str(ROOT / "site-dist")],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
try:
    for _ in range(50):
        try:
            if urlopen(URL, timeout=1).status == 200:
                break
        except Exception:
            time.sleep(0.2)
    else:
        raise RuntimeError("Local site server never became ready")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", headless=True)
        viewport_results = []
        for width, height in VIEWPORTS:
            page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
            console_messages = []
            failed_responses = []
            page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}") if msg.type in ("warning", "error") else None)
            page.on("pageerror", lambda error: console_messages.append(f"pageerror: {error}"))
            page.on("response", lambda response: failed_responses.append(f"{response.status} {response.url}") if response.status >= 400 else None)
            page.goto(URL, wait_until="domcontentloaded", timeout=30000)
            navigation_metrics = check_navigation_layout(page, width)
            mark_counts = wait_for_charts(page)
            page.evaluate("async () => { await document.fonts.ready; return true; }")
            metrics = page.evaluate("""() => ({
              fullWidth: document.documentElement.scrollWidth,
              viewport: window.innerWidth,
              ready: document.querySelectorAll('.chart-ready').length,
              errors: document.querySelectorAll('.chart-error').length,
              v13Marks: document.querySelectorAll('#chart-mount-V13 svg .role-mark').length,
              sourceLinks: document.querySelectorAll('a[href^="https://"]').length
            })""")
            if metrics["fullWidth"] > width or metrics["ready"] != 13 or metrics["errors"] or not metrics["v13Marks"]:
                raise AssertionError(f"Viewport {width}×{height} failed layout/render checks: {metrics}")
            if console_messages or failed_responses:
                raise AssertionError(f"Viewport {width}×{height} browser output: {console_messages}, {failed_responses}")

            if width in (390, 1024, 1280):
                heatmap_contrast = check_heatmap_label_contrast(page)
            else:
                heatmap_contrast = None
            if width in (390, 1024, 1280):
                treemap_contrast = check_treemap_label_contrast(page)
            else:
                treemap_contrast = None
            if width in (1024, 1280):
                choropleth_contrast = check_choropleth_label_contrast(page)
                hexbin_visibility = check_hexbin_visibility(page)
            else:
                choropleth_contrast = None
                hexbin_visibility = None
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(path=str(OUT / f"screen-{width}x{height}.png"), animations="disabled")
            if width in (390, 1024, 1280, 1366, 1600):
                page.screenshot(path=str(OUT / f"full-{width}.png"), full_page=True, animations="disabled")
                for chart_id in CHART_IDS:
                    page.locator(f'.chart-entry[data-chart-id="{chart_id}"]').screenshot(
                        path=str(OUT / f"{chart_id}-{width}.png"), animations="disabled"
                    )
            if width == 1280:
                grayscale_style = page.add_style_tag(content="html { filter: grayscale(1) !important; }")
                page.screenshot(path=str(OUT / "full-grayscale-1280.png"), full_page=True, animations="disabled")
                v03 = page.locator("#chart-mount-V03 svg")
                v03.evaluate('(svg) => { svg.style.filter = "grayscale(1)"; }')
                page.locator('.chart-entry[data-chart-id="V03"]').screenshot(
                    path=str(OUT / "V03-grayscale-1280.png"), animations="disabled"
                )
                v03.evaluate('(svg) => { svg.style.filter = ""; }')
                grayscale_style.evaluate("style => style.remove()")
            viewport_results.append({"viewport": f"{width}x{height}", **metrics, "navigation": navigation_metrics, "marks": mark_counts, "heatmapContrast": heatmap_contrast, "treemapContrast": treemap_contrast, "choroplethLabelContrast": choropleth_contrast, "hexbinVisibility": hexbin_visibility})
            page.close()

        reduced = browser.new_page(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        reduced.goto(URL, wait_until="domcontentloaded", timeout=30000)
        reduced_metrics = reduced.evaluate("""() => ({
          requested: matchMedia('(prefers-reduced-motion: reduce)').matches,
          scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior
        })""")
        if not reduced_metrics["requested"] or reduced_metrics["scrollBehavior"] != "auto":
            raise AssertionError(f"Reduced-motion behavior failed: {reduced_metrics}")
        reduced.close()

        interaction_results = check_interactions(browser)
        results = {"viewports": viewport_results, "reducedMotion": reduced_metrics, "interactions": interaction_results}
        (OUT / "editorial-navigation-qa.json").write_text(
            json.dumps(results, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(json.dumps(results, ensure_ascii=False))
        browser.close()
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
