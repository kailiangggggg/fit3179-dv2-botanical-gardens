# Sources, methods and reuse notes

**Snapshot date:** 14 October 2026  
**Story scope:** Known botanical-garden and arboretum facilities, separate open institutional record sets, and licensed seed-bank accession origins. The site does not rank garden conservation performance or claim a complete national plant inventory.

## Geoscience Australia facility register

**Source:** [Botanical Gardens and Arboretums service](https://services.ga.gov.au/gis/rest/services/Botanical_Gardens_and_Arboretums/MapServer/0?f=pjson), Geoscience Australia. The 14 October snapshot contains 182 features: 120 Botanic Gardens and 62 Arboretums. It includes `globalid`, subtype, state, latitude, longitude and `area_hectares`.

**Licence:** CC BY 4.0 as recorded in the source recheck. Attribution is included in the site source notes. State boundaries in the map are from the ABS source below. The register is a known-facility layer, not proof that all facilities are represented, publicly accessible, or equally active in conservation.

**Use:** V01 maps one point per register feature and scales circle area to reported hectares. V02/V03 count facilities by the GA state code and compare the resulting population-standardized rates. V04 compares registered areas by subtype. The public point file omits source polygon detail and retains only chart fields.

## Australian Bureau of Statistics

**Population source:** [National, state and territory population, March 2026](https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population/mar-2026), Table 3 in `31010do001_202603.xlsx`. The release date is 17 September 2026; population reference date is 31 March 2026. The exact published ERP inputs (persons) are:

| Jurisdiction | ERP |
|---|---:|
| New South Wales | 8,670,105 |
| Victoria | 7,154,221 |
| Queensland | 5,739,461 |
| South Australia | 1,916,836 |
| Western Australia | 3,096,222 |
| Tasmania | 580,691 |
| Northern Territory | 268,899 |
| Australian Capital Territory | 489,668 |
| Other Territories | 5,047 |

**Boundary source:** [ASGS Edition 4 digital boundaries](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs/edition-4-july-2026-june-2031/access-and-downloads/digital-boundary-files) and the [ASGS 2026 State/Territory geospatial service](https://geo.abs.gov.au/arcgis/rest/services/ASGS2026/STE/MapServer). Boundaries are CC BY 4.0 unless the product states otherwise. The local display snapshot queries the full STE layer with 0.005-degree maximum offset and four-decimal coordinate precision; it is then checked to retain the complete New South Wales extent. A faster generalized-layer query was rejected after its NSW geometry omitted the western part of the state. Code Z has no geometry and is omitted; codes 1–9 are retained. Before publication, derived polygons are oriented for [D3's spherical path convention](https://d3js.org/d3-geo): exterior rings clockwise and interior rings counterclockwise. The largest valid ring is placed first as the shell, and rings collapsed by coordinate rounding are dropped; zero-area exterior rings otherwise describe the spherical complement to D3. This convention is opposite RFC 7946’s planar right-hand rule.

**Measure:** V02 uses `known GA facilities ÷ ERP × 1,000,000` for codes 1–8. Other Territories contains one GA facility on Norfolk Island, while its ABS denominator groups Norfolk Island with Jervis Bay, Christmas Island and Cocos (Keeling) Islands. Its calculated 198.14 per-million rate is shown in the method summary but excluded from the choropleth and rank comparison because the four-territory denominator and single-site numerator are not a comparable state-level unit. The Norfolk facility remains in V01. The rate is register density, not access or service quality.

## ALA / Australian Virtual Seed Bank

The [Australian Virtual Seed Bank](https://seedbank.ala.org.au/) is an Australian Seed Bank Partnership and Atlas of Living Australia collaboration. The current local acquisition includes these ten resource records whose metadata states CC BY 3.0 AU. The Victorian Conservation Seed Bank resource dr21987 is CC BY-NC 3.0 AU and is excluded.

| ALA resource | Snapshot root accessions | Map-ready coordinate pairs | Root accessions with a usable year |
|---|---:|---:|---:|
| [National Seed Bank (dr21985)](https://collections.ala.org.au/public/show/dr21985) | 16,323 | 14,218 | 14,038 |
| [Tasmanian Seed Conservation Centre (dr21986)](https://collections.ala.org.au/public/show/dr21986) | 2,481 | 2,424 | 2,252 |
| [George Brown Darwin Botanic Gardens Seed Bank (dr21988)](https://collections.ala.org.au/public/show/dr21988) | 101 | 101 | 101 |
| [WA Seed Centre, Kings Park (dr21991)](https://collections.ala.org.au/public/show/dr21991) | 15,110 | 6,984 | 13,077 |
| [WA Seed Centre, Kensington (dr21992)](https://collections.ala.org.au/public/show/dr21992) | 6,570 | 2,178 | 0 |
| [Greening Australia (dr21993)](https://collections.ala.org.au/public/show/dr21993) | 40 | 1 | 0 |
| [Brisbane Botanic Gardens Seed Bank (dr22131)](https://collections.ala.org.au/public/show/dr22131) | 1,942 | 618 | 1,764 |
| [South Australian Seed Conservation Centre (dr23109)](https://collections.ala.org.au/public/show/dr23109) | 2,536 | 2,299 | 2,533 |
| [Australian PlantBank (dr23110)](https://collections.ala.org.au/public/show/dr23110) | 12,871 | 9,950 | 0 |
| [Alice Springs Desert Park (dr28420)](https://collections.ala.org.au/public/show/dr28420) | 588 | 0 | 0 |

Counts are from the downloaded archives on 14 October 2026. The ten archives contain 119,278 event rows, but 60,716 are linked child rows; only 58,562 top-level events with blank `parentEventID` are treated as accession records. Event rows are not interchangeable with accessions, seed amounts, tests or conservation outcomes. Resource coverage differs, so V05 describes index coverage and does not rank the banks.

For mapping, the pipeline additionally requires `countryCode=AU`, a finite coordinate pair, and coordinates inside the ASGS extent (longitude 96°–169°, latitude −45°–−8°). This leaves 38,773 map-ready top-level records. It projects the coordinates to spherical Australian Albers equal-area and bins them into 100 km-wide hexagons. Cells with fewer than five records are suppressed: 38,099 records are displayed in published cells and 674 records fall in suppressed cells. The GeoJSON contains only aggregate hexagon geometry and counts; no source point or event ID is published. These are wild collection origins, not garden or receiving-bank locations.

For V11/V13, a year is accepted from the normalized `year` field or parsed from `eventDate`. There are 33,765 dated top-level accessions across the ten resources, with usable years from 1961 to 2025. Four resources have no usable year in their top-level archive snapshot. The histogram is limited to the dated records and is not an annual seed-bank activity series.

## GBIF institutional datasets

**PlantBank:** [PlantBank Records](https://www.gbif.org/dataset/8805b51e-d8e8-41d0-8976-d653d39c7a91), published by the Royal Botanic Gardens & Domain Trust, is CC BY 4.0. The downloaded occurrence archive contains 10,609 records, all with `basisOfRecord=LIVING_SPECIMEN`. Of these, 10,599 have a family and 9,689 have a parseable year (1960–2015). V06/V07/V09 describe indexed living-specimen records only. They do not report total holdings or annual additions.

**Kings Park:** [Kings Park Botanical Gardens](https://www.gbif.org/dataset/e80ff7bd-2c75-4ecb-bb5c-fde9d1bd1cd8), published by WA Botanic Gardens and Parks Authority, is CC BY 4.0. The downloaded occurrence archive contains 20,647 `PRESERVED_SPECIMEN` records and 20,646 family values. This is a herbarium voucher dataset, not a living-collection or seed-accession file. Although dataset metadata gives a temporal range, the current downloaded occurrence rows contain no parseable `year` or `eventDate`; no Kings Park time-series chart is made.

## BGANZ / CHABG published survey context

**Published report:** [Myrtle Rust survey of Australian ex situ collections — Supplementary Final Report, December 2023](https://www.bganz.org.au/wp-content/uploads/2025/04/Myrtle-Rust-Survey-Supplemental-Final-Report-Dec-2023-Public-release.pdf). Its survey covered 26 respondent organizations, including mixed botanic garden, seed bank and nursery organizations and respondents in Australia, New Zealand and the United Kingdom. It reports 1,899 accepted Myrtaceae species in ex situ collections versus 3,072 accepted Myrtaceae species in the December 2023 APC (62%), and 45 of 49 MRNAP priority species represented (92%). This is a respondent-survey baseline, not a census of Australian gardens or a measure of conservation outcomes.

The workbook has no explicit reuse licence in the recheck; its local copy is not read by the production pipeline and is not published. No institution-level BGANZ chart, reconstructed accession table, or workbook graphic is reused. The report has an internal EPBC absent-species count inconsistency (158/182 captured implies 24 remaining, while the report says 23); that count is not repeated. The report’s 62% and 92% aggregate findings are presented as brief attributed text only.

## Excluded sources

- `australian_flagship_gardens_operational_panel_2018_2024.csv`: quarantined due missing value-level provenance and inconsistent definitions; excluded from all outputs.
- `melbourne_threatened_plants.csv`: the source is a City of Melbourne planting-priority assessment, not an RBGV or national garden inventory; excluded from quantitative garden claims.
- `bganz_myrtle_rust_database_2023.xlsx`: licence/reuse for named institution-level derivatives is uncertain; preserved locally, not read by the production pipeline, and not published.
- ALA dr21987, Victorian Conservation Seed Bank: excluded because its resource-level metadata is CC BY-NC 3.0 AU.

## Reproducibility and attribution

The local raw-snapshot manifest is kept outside the public repository at `D:\FIT3179\DV2\data\raw\source_snapshots.json`. The subset of hashes used by the production pipeline is published in [`../public/data/source_provenance.json`](../public/data/source_provenance.json). `scripts/fetch_sources.py` downloads only the 15 allowlisted inputs, preserves existing snapshots, and supports `--verify-only`. `scripts/prepare_data.py` performs the documented filters, joins, aggregations, area summaries, rank calculations and hexbin transformation. The resulting public data payload is approximately 1.2 MB. Chart specifications and data files are in the same repository and use relative URLs.

Attribution appears on the webpage and in these notes. Derived data and chart marks are original work; source data have been filtered, joined, summarized or spatially aggregated as described. The self-hosted Fraunces and Source Sans 3 fonts are distributed under SIL Open Font License 1.1; license files are included under `licenses/fonts/`.
