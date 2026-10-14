# Beyond the Garden Gate

FIT3179 Data Visualisation 2 — Topic 7, Botanical Gardens. This repository contains the single-page data story, Vega-Lite specifications, chart-ready data, source preparation scripts and validation checks.

## Rebuild the source snapshots and chart data

The raw snapshots stay in the sibling `D:\FIT3179\DV2\data\raw` folder and are not part of the public website repository. From this repository folder, fetch any missing allowlisted sources and verify the pinned local copies:

```powershell
python -m scripts.fetch_sources --raw-root ..\data\raw
python -m scripts.fetch_sources --verify-only --raw-root ..\data\raw
python -m scripts.prepare_data --raw-root ..\data\raw --output-dir public\data
python -m unittest discover -s tests -v
```

The fetch script does not overwrite an existing source snapshot. It excludes the CC BY-NC Victorian Conservation Seed Bank resource, the BGANZ workbook, the quarantined visitor panel and the City of Melbourne planting-priority dataset.

## Run and build the website

Use Node.js 22 or newer and pnpm 11.25.0 (pinned in `package.json`). The site vendors Vega, Vega-Lite, Vega-Embed and the two licensed font families locally; the charts do not call a third-party data API at runtime.

```powershell
pnpm install
pnpm run validate:specs
pnpm run dev
pnpm run build
```

`pnpm run build` writes the static GitHub Pages site to `docs/`. To preview the built site locally, run `pnpm run preview`.

## Public chart files

- Readable Vega-Lite v5 JSON specifications: [`public/specs/`](public/specs/)
- Machine-readable What / Why / How manifest: [`public/specs/chart-manifest.json`](public/specs/chart-manifest.json)
- Human-readable chart inventory: [`CHART_MANIFEST.md`](CHART_MANIFEST.md)
- Chart-ready data (about 1.2 MB in the 14 October 2026 snapshot): [`public/data/`](public/data/)
- Source, licence, filters and limitations: [`docs/sources-and-methods.md`](docs/sources-and-methods.md)
- A separate project-level execution status record is maintained in the parent DV2 workspace.

The origin map uses 100 km equal-area hexagons and suppresses cells with fewer than five records. No raw ALA collection-origin coordinates or event identifiers are published. The GA facility coordinates are published with attribution under the source licence.

## GitHub Pages

The production build is the `docs/` directory. Configure GitHub Pages to publish `main` from `/docs` after the repository is pushed. Verify the resulting public URL in a signed-out browser before submitting. The physical hand-drawn sketch, student identity fields and interview remain student actions.
