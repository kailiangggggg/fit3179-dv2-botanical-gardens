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
OUT = ROOT / "tmp" / "hd-review"
OUT.mkdir(parents=True, exist_ok=True)
VIEWPORTS = ((320, 700), (390, 844), (768, 900), (1024, 768), (1280, 800), (1600, 1000))
CHART_IDS = tuple(f"V{i:02}" for i in range(1, 14))


def wait_for_charts(page):
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
            symbols = frame.locator("svg .layer_1_marks path")
            distinct_shapes = symbols.evaluate_all(
                "paths => new Set(paths.map((path) => path.getAttribute('d'))).size"
            )
            if distinct_shapes < 8:
                raise AssertionError(f"V03 does not show eight distinct endpoint shapes: {distinct_shapes}")
    return mark_counts


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


def check_interactions(browser):
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    console_messages = []
    failed_responses = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}") if msg.type in ("warning", "error") else None)
    page.on("pageerror", lambda error: console_messages.append(f"pageerror: {error}"))
    page.on("response", lambda response: failed_responses.append(f"{response.status} {response.url}") if response.status >= 400 else None)
    page.goto(URL, wait_until="domcontentloaded", timeout=30000)
    mark_counts = wait_for_charts(page)

    large_symbol = page.locator('#chart-mount-V01 .layer_1_marks path[aria-label*="Helms Arboretum"]').first
    box = large_symbol.bounding_box()
    if not box or box["width"] < 10 or box["height"] < 10:
        raise AssertionError(f"V01 maximum-area symbol is not visibly targetable: {box}")
    large_symbol.hover(position={"x": box["width"] * 0.25, "y": box["height"] * 0.25}, timeout=10000)
    page.locator(".vg-tooltip").wait_for(state="visible", timeout=5000)
    tooltip_text = page.locator(".vg-tooltip").inner_text()
    if "Facility" not in tooltip_text:
        raise AssertionError(f"V01 tooltip did not identify the facility: {tooltip_text}")

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
        rankSelected: opacity('#chart-mount-V03 .layer_0_marks path[aria-label*="Australian Capital Territory"]'),
        rankOther: opacity('#chart-mount-V03 .layer_0_marks path[aria-label*="Victoria"]')
      };
    }""")
    if focus_opacity["mapSelected"] != 1 or focus_opacity["rankSelected"] != 1 or focus_opacity["mapOther"] >= 0.2 or focus_opacity["rankOther"] >= 0.2:
        raise AssertionError(f"V02/V03 linked jurisdiction focus failed: {focus_opacity}")
    selector.select_option(label="All jurisdictions")
    page.wait_for_function('document.querySelector("#jurisdiction-focus-status")?.textContent.includes("All jurisdictions")')

    legend = page.locator("#chart-mount-V03 .role-legend-label[role=button]").first
    legend.focus()
    page.keyboard.press("Space")
    page.wait_for_function('(el) => el.getAttribute("aria-pressed") === "true"', arg=legend.element_handle())
    space_label = legend.get_attribute("aria-label")
    legend.press("Enter")
    page.wait_for_function('(el) => el.getAttribute("aria-pressed") === "false"', arg=legend.element_handle())

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

    result = {"marks": mark_counts, "tooltip": tooltip_text.replace("\n", " | "), "linkedFocus": focus_opacity, "keyboardFilter": space_label, "focus": focus, "fonts": fonts}
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

            if width == 390:
                heatmap_contrast = check_heatmap_label_contrast(page)
            else:
                heatmap_contrast = None
            if width in (390, 1280):
                treemap_contrast = check_treemap_label_contrast(page)
            else:
                treemap_contrast = None
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(path=str(OUT / f"screen-{width}x{height}.png"), animations="disabled")
            if width in (390, 1280):
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
            viewport_results.append({"viewport": f"{width}x{height}", **metrics, "marks": mark_counts, "heatmapContrast": heatmap_contrast, "treemapContrast": treemap_contrast})
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
        print(json.dumps({"viewports": viewport_results, "reducedMotion": reduced_metrics, "interactions": interaction_results}, ensure_ascii=False))
        browser.close()
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
