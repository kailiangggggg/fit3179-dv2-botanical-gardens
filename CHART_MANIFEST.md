# Chart manifest

**Inventory:** 13 rubric-counted chart groups, 14 visible panels, 3 map idioms, and 8 distinct advanced idiom types. V05a/V05b remains one paired chart group. Final visual and browser review was completed on 18 October 2026; these counts describe the implementation and do not predict a marker-assessed grade.

The complete machine-readable What / Why / How contracts, field types, transformations, mark/channel choices, interactions, caveats, spec paths and data paths are in [`public/specs/chart-manifest.json`](public/specs/chart-manifest.json). Each readable Vega-Lite v5 specification is in [`public/specs/`](public/specs/).

| ID | Reader question | Idiom | Source / grain | Spec / data | Class |
|---|---|---|---|---|---|
| V01 | Where are the known gardens and arboreta, and how do their registered areas vary? | Graduated-symbol map | GA, one registered facility feature | [`V01`](public/specs/V01-facility-symbol-map.json) · facility points + ASGS boundaries | Advanced map |
| V02 | How many known facilities are registered per million residents? | Choropleth | GA counts + ABS March 2026 ERP, one state/territory | [`V02`](public/specs/V02-facilities-per-million-choropleth.json) · joined state GeoJSON | Advanced map |
| V03 | Which state rankings shift after population adjustment? | Slopegraph | Same eight standard jurisdictions as V02 | [`V03`](public/specs/V03-count-rate-slopegraph.json) · rank comparison CSV | Advanced |
| V04 | Do registered facility footprints differ by type? | Box plot | GA, one facility area | [`V04`](public/specs/V04-registered-footprint-boxplot.json) · area records/stats | Advanced |
| V05a/V05b | What do licensed seed-bank resources expose? | Paired dot plot | Ten ALA resources, top-level accession records and distinct taxon IDs | [`V05`](public/specs/V05-seedbank-resource-profile.json) · ALA resource profile | Basic; one chart group |
| V06 | Which genera appear in PlantBank’s most-recorded families? | Treemap | GBIF PlantBank, family-identified LIVING_SPECIMEN records | [`V06`](public/specs/V06-plantbank-family-treemap.json) · family treemap | Advanced |
| V07 | When were PlantBank living-specimen records dated? | Histogram | GBIF PlantBank, rows with a usable year | [`V07`](public/specs/V07-plantbank-date-histogram.json) · decade counts | Advanced |
| V08 | Which named family is most common in Kings Park herbarium records? | Ranked dot plot | GBIF Kings Park, PRESERVED_SPECIMEN records | [`V08`](public/specs/V08-kingspark-family-records.json) · family counts | Basic |
| V09 | How do PlantBank family records span recorded decades? | Matrix / heatmap | GBIF PlantBank, family × decade among 9,683 dated records | [`V09`](public/specs/V09-plantbank-family-decade-heatmap.json) · cross-tab | Advanced |
| V10 | Where were licensed seed-bank accessions collected? | Equal-area hexbin map | Ten CC BY ALA resources, top-level AU-coded accession origins | [`V10`](public/specs/V10-avsb-origin-hexbin.json) · suppressed 100 km hexagons | Advanced map |
| V11 | What years do the dated ALA accessions record? | Histogram | ALA top-level accessions with usable dates | [`V11`](public/specs/V11-avsb-accession-years.json) · decade counts | Advanced |
| V12 | How much of each seed-bank resource can be mapped? | Horizontal bar / dot plot | ALA resource coordinate completeness | [`V12`](public/specs/V12-avsb-coordinate-coverage.json) · resource coverage | Basic |
| V13 | Which accession archives provide usable year ranges? | Interval plot | ALA top-level accession year coverage by resource | [`V13`](public/specs/V13-avsb-date-coverage.json) · date ranges | Basic |

## Analytical contracts

### V01 — Facility geography

- **What:** GA’s 182 known-register facilities with coordinates, subtype and registered hectares.
- **Why:** Locate sites and compare reported facility footprints.
- **How:** Equal Earth map; position encodes location, four graduated circle sizes encode registered-area classes, and hue encodes Botanic Garden versus Arboretum. The legend states the hectare ranges; the tooltip retains each reported area. Hover highlights a facility.
- **Limit:** Symbol sizes show area classes, not continuous area proportions or within-class differences. Register inclusion is not proof of national completeness, public access, collection size or conservation performance.

### V02 — State-level register density

- **What:** GA facility counts joined to ABS ERP for 31 March 2026 and ASGS Edition 4 code 1–8 boundaries.
- **Why:** Compare known register counts after adjusting for resident population.
- **How:** State polygons; sequential blue luminance encodes facilities per million. State labels use dark text on light fills and white text with a dark outline on the two darkest fills. A linked jurisdiction selector focuses the same state on V03. The tooltip reveals numerator and denominator. Other Territories is neutral on the map.
- **Limit:** It is register density, not access. The code-9 denominator groups Norfolk Island, Jervis Bay, Christmas Island and Cocos (Keeling) Islands; its 198.14 per-million value is not in the comparison.

### V03 — Count-to-rate rank change

- **What:** Raw GA counts and March 2026 ERP-normalized rates for the same eight jurisdictions.
- **Why:** Show which jurisdictions change order after population adjustment.
- **How:** Lines join two rank positions; rank 1 is highest. TAS and NT share 7.5 on facility count. Short state abbreviations label the rate-rank endpoints; contrast-tested color and distinct endpoint shapes provide redundant cues. The full-name keyboard-operable legend filters series with click or Enter/Space. Choose All jurisdictions to clear the filter. The linked selector highlights the same state on V02; hover gives exact values.
- **Limit:** Rank is ordinal and hides magnitude; the rate map and labels carry the values.

### V04 — Footprint distributions

- **What:** `area_hectares` by GA subtype across 182 features.
- **Why:** Compare typical facility area and the long-tailed spread.
- **How:** The center line marks the median and each box spans the middle half of registered areas; whiskers show the usual range and dots name sites beyond it. A labelled log axis keeps small and very large sites visible together.
- **Limit:** Hectares describe registered footprint, not planted or conservation area.

### V05a/V05b — ALA record coverage

- **What:** Top-level accession counts and distinct `taxonKey` counts per licensed ALA resource.
- **Why:** Show the coverage and uneven scope of the open seed-bank index before interpreting its maps.
- **How:** Two aligned dot panels use separate logarithmic count scales but share resource ordering and hover detail.
- **Limit:** Taxon IDs are database labels, not verified species counts. Resource record coverage is not total bank holdings or conservation quality. Linked child events are excluded.

### V06 — PlantBank family composition

- **What:** 10,599 family-identified rows from GBIF’s 10,609 `LIVING_SPECIMEN` records.
- **Why:** Describe the taxonomic composition of the open PlantBank record set.
- **How:** Hierarchical family parent rectangles nest observed genus records within five leading families. Genus tile area is proportional to record count; pooled genera and the remaining families are labelled as groups, not taxa. A CVD-screened qualitative palette supports the family key, and purple consistently highlights Myrtaceae in both V06 and V08.
- **Reader note:** A plant family groups related genera. Of 3,240 PlantBank records labelled Myrtaceae, 1,897 are labelled Eucalyptus.
- **Limit:** An indexed specimen record is not a total of current living holdings.

### V07 — PlantBank recorded years

- **What:** 9,689 PlantBank records with a parseable year, spanning 1960–2015.
- **Why:** Show the time span represented in dated rows.
- **How:** Continuous ten-year bins with quantitative start and end bounds, zero-baseline bar heights and exact count tooltips; the 2010s are partial because this archive ends in 2015.
- **Limit:** 920 records lack a usable year; counts do not represent annual acquisitions.

### V08 — Kings Park family records

- **What:** Family values from 20,647 GBIF `PRESERVED_SPECIMEN` rows.
- **Why:** Show the composition of a separate herbarium reference dataset.
- **How:** Ranked horizontal dots show specimen-record counts by family; smaller families are pooled. The title identifies the largest named family because the pooled “Other families” category contains several groups.
- **Limit:** These are herbarium vouchers, not living-collection or seed-bank holdings. The archive’s occurrence rows lack parseable date fields despite temporal-range metadata.

### V09 — PlantBank family by decade

- **What:** 9,683 PlantBank living-specimen rows with both family and usable year, aggregated by family × decade.
- **Why:** Compare whether prominent family groups have the same recorded time span.
- **How:** Matrix tiles encode counts with a sequential green scale fixed at 0–2,000 records and 500-record legend steps. Dark text labels positive cells, switching to white only on dark cells where it remains legible.
- **Limit:** It describes the dated indexed sample, not yearly additions or conservation outcomes.

### V10 — Seed-bank collection origins

- **What:** 38,773 root accessions with AU country code and valid coordinates inside the national map extent from ten CC BY resources.
- **Why:** Show the broad geography of wild material represented in participating seed-bank records.
- **How:** Spherical Australian Albers equal-area projection and 100 km-wide hex bins. A logarithmic scale maps the published 5–2,629 record range to a monotonic teal-to-blue luminance ramp; legend ticks are 5, 20, 100, 500 and 2,629. The lightest cells remain distinct from neutral land. Cells below five records are suppressed; 38,099 records appear in published bins.
- **Limit:** Origins are not garden or receiving-bank locations. Coordinate coverage varies by resource.

### V11 — ALA accession years

- **What:** 33,765 dated top-level accession records across ten ALA resources.
- **Why:** Show the recorded year distribution for the dated sample.
- **How:** Continuous ten-year bins, quantitative start/end, zero-baseline frequency bars, top-level accessions only. The 2020s are incomplete at the 2025 snapshot.
- **Limit:** Four resource archives have no usable top-level year; missingness differs. This is not annual activity.

### V12 — Map-coordinate completeness

- **What:** Map-ready coordinate pairs divided by root accessions for each ALA resource.
- **Why:** Let the reader see how coverage differs before interpreting V10.
- **How:** Horizontal bars, endpoint dots, printed percentages and exact numerator/denominator tooltips.
- **Limit:** The percentage describes metadata completeness in this snapshot, not a resource’s geographic representativeness.

### V13 — ALA date coverage

- **What:** Earliest and latest usable top-level accession years by resource.
- **Why:** Show that the combined date histogram draws on different time spans.
- **How:** Horizontal interval rules with endpoint circles, plus an explicit list of resources without usable years.
- **Limit:** A date range describes the file’s usable records, not continuous sampling or yearly conservation activity.
