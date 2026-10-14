# Design direction gate — Beyond the Garden Gate

**Status:** Approved by the user on 14 October 2026; the complete page is implemented, deployed, and browser-verified.
**Why this gate exists:** The supplied project `AGENTS.md` requires a representative screen and explicit user review before broad implementation for substantial UI work. The user approved continuing with the preview’s visual style and layout.

## Audience and purpose

The page is a single-scrolling editorial data story for a general Malaysian reader. It explains what the public datasets can and cannot show about Australia’s botanical gardens, living-specimen records, herbarium vouchers and seed-bank collection origins. The task is presentation and storytelling, not a filter-heavy dashboard.

## Visual direction

Use a **botanical field atlas**: quiet natural-history typography and paper-neutral surfaces, with functional interface rails for section numbers, source names, record grains, snapshot dates and chart IDs. The interface should feel like a careful evidence workstation, not a movie HUD. Those rails carry real source and navigation information only.

- Page ground: warm off-white; text: dark ink; accents: garden green, seed-bank ochre and a restrained rust highlight.
- Display type: locally bundled Fraunces; body and chart labels: locally bundled Source Sans 3. Both packages carry SIL Open Font License 1.1 files, retained under `licenses/fonts/`.
- Layout: one continuous column with a narrow section index on desktop, restrained source/limitation inspectors beside major charts, thin rules and generous but consistent figure spacing. The index uses anchor links and never replaces page sections.
- Charts: stable, aligned figure surfaces with readable legends, axes, direct units and tooltips. The static page must tell the full story without interaction.
- Responsive behavior: the section index collapses to a compact navigation row; chart content stays within the viewport; figures keep enough height for their labels.
- No external data requests at runtime, photos, decorative telemetry, glass effects, neon glow, fake statistics or generic SaaS card grids.

## Review screen

`prototype.html` is a representative first-screen prototype: title/central question, the three sourced register figures, V01 map, a source/limitation inspector and the section rail. The chart uses the current GA and ABS snapshots. Production-render screenshots are saved as `design-direction-preview.png` (desktop full page) and `design-direction-preview-mobile.png` (390 px full page).

The ABS polygons are prepared for D3/Vega spherical rendering: the largest valid component ring is ordered first, collapsed rings are removed, and shell/hole winding follows D3's convention. The map projection scales and translates with the chart width. Browser QA at 1280, 768 and 390 px found eight state shapes, no horizontal overflow and no page, network or console errors.

The deployed page is public at <https://kailiangggggg.github.io/fit3179-dv2-botanical-gardens/>. Live QA rendered all 13 chart groups at 1280 px and 390 px, with no failed requests, page errors, console errors, third-party runtime requests or horizontal overflow. Final live screenshots are `desktop-site-first-screen.jpg`, `desktop-site-full.jpg`, `mobile-site-first-screen.jpg` and `mobile-site-full.jpg` in this directory.

## Named design-reference availability

The installed skill and plugin cache was searched for the six references from `AGENTS.md`; each returned **NOT_FOUND**, and none was installed, copied or claimed as used:

- `retro-ascii-skills` — NOT_FOUND
- `lieflat-charts` — NOT_FOUND
- `photo-abstract-editorial` — NOT_FOUND
- `gathered-scenes-zine-skills` — NOT_FOUND
- `create-quite-humanist-designs` — NOT_FOUND
- `gc-minimal-zine-poster` — NOT_FOUND

The prototype uses the user’s stated design principles and existing G-DV2-02 story architecture instead.
