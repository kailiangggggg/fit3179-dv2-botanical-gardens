export const pageStory = {
  title: "Beyond the Garden Gate",
  subtitle: "Mapping Australia’s gardens, plant collections and wild seed origins",
  snapshot: "14 October 2026",
  hero: {
    "kicker": "AUSTRALIA · BOTANICAL CONSERVATION",
    "titleLines": [
      "Beyond the",
      "Garden Gate"
    ],
    "lede": "Plant collections can support botanical research and conservation, while some gardens also educate people about biodiversity. This story moves from a register of Australian gardens and arboreta to separate living and preserved specimen records, then to recorded wild seed origins.",
    "limitation": "These records show documented work, not every institution, current holdings, public access, species recovery, conservation effectiveness or education outcomes."
  },
  metrics: [
    {
      "value": "182",
      "label": "known registered facilities",
      "source": "Geoscience Australia · 2026 snapshot"
    },
    {
      "value": "120",
      "label": "Botanic Gardens",
      "source": "GA register"
    },
    {
      "value": "62",
      "label": "Arboreta",
      "source": "GA register"
    }
  ],
  jurisdictions: [
    "New South Wales",
    "Victoria",
    "Queensland",
    "Western Australia",
    "South Australia",
    "Australian Capital Territory",
    "Northern Territory",
    "Tasmania",
  ],
  sections: [
    {
      "id": "footprint",
      "index": "01",
      "navLabel": "A national footprint",
      "eyebrow": "MAP & REGISTER",
      "title": "A national footprint",
      "question": "Where are more known gardens and arboreta registered, and what changes after population adjustment?",
      "intro": "Circle area compares raw jurisdiction totals; labels repeat the counts. Symbols sit at representative points, not individual gardens. These counts are not population-adjusted.",
      "paragraphs": [
        "One registered facility belongs to Other Territories and is on Norfolk Island; its marker is approximate. The register is a known-facility layer, not a complete census."
      ],
      "transition": "The register maps known places; the next chapter distinguishes the living, preserved and seed records that document botanical collections.",
      "chartIds": [
        "V01",
        "V02",
        "V03",
        "V04"
      ],
      "chartTransitions": [
        {
          "afterChart": "V01",
          "emphasis": true,
          "text": "NSW, Victoria and Queensland account for 135 of 182 registered facilities. Raw jurisdiction counts show where the register clusters; they don't tell us how easy those sites are to reach. V02 adds population context."
        },
        {
          "afterChart": "V02",
          "text": "ACT has the highest rate: 12.25 registered facilities per million residents. The population-adjusted rate changes comparisons, but tells us nothing about public access. V03 compares rank shifts."
        },
        {
          "afterChart": "V03",
          "text": "ACT rises from sixth by count to first by rate; NT climbs from a tied rank of 7.5 to second. The lines show rank order, not the size of the gaps. V04 compares footprints."
        },
        {
          "afterChart": "V04",
          "text": "The typical footprint is similar for gardens (12.96 ha) and arboreta (12.74 ha). One arboretum covers 3,739 ha; area alone does not show conservation value."
        }
      ]
    },
    {
      "id": "records",
      "index": "02",
      "navLabel": "Inside the collections",
      "eyebrow": "COLLECTION RECORDS",
      "title": "Inside the collections",
      "question": "What do selected public records show about living plants, preserved specimens and seed accessions?",
      "intro": "A seed-bank accession is a catalogued seed collection. PlantBank records use the basis LIVING_SPECIMEN; Kings Park records are PRESERVED_SPECIMEN herbarium vouchers. A plant family groups genera. These separate samples cannot be added into one total of holdings.",
      "paragraphs": [
        "Counts describe indexed records, not necessarily distinct species or plants alive today. The ten licensed ALA resources also differ in what metadata they publish."
      ],
      "transition": "These sources document different slices of collections. The next chapter maps recorded wild origins and shows how much coordinate and date information is available.",
      "chartIds": [
        "V05",
        "V06",
        "V07",
        "V08",
        "V09"
      ],
      "chartTransitions": [
        {
          "afterChart": "V05",
          "text": "National Seed Bank has the most top-level accessions (16,323). Australian PlantBank has the most distinct taxon IDs (4,743). These are different record counts, not total holdings or verified species richness."
        },
        {
          "afterChart": "V06",
          "text": "In PlantBank, Myrtaceae has 3,240 family-labelled records, including 1,897 Eucalyptus records. Myrtle rust threatens plants in this family. A separate survey found 45 of 49 priority species in respondents’ off-site collections across 26 organisations, including some in New Zealand and the UK; it does not measure PlantBank outcomes."
        },
        {
          "afterChart": "V07",
          "text": "The 1980s have the most dated PlantBank rows: 4,321. Of 10,609 records, 920 have no usable year, and the recorded year may not be the accession date. This is not a tally of new holdings."
        },
        {
          "afterChart": "V08",
          "text": "Herbarium vouchers aid plant identification and research. The Australian National Botanic Gardens’ Botany program uses herbarium specimens in lessons; this is separate from Kings Park’s dataset, which has no learning-outcome data."
        },
        {
          "afterChart": "V09",
          "text": "The 1980s hold 1,843 Myrtaceae records, out of 9,683 PlantBank rows with both family and year. That's a pattern in the archive, not evidence of more conservation work then."
        }
      ]
    },
    {
      "id": "origins",
      "index": "03",
      "navLabel": "Beyond the garden gate",
      "eyebrow": "WILD COLLECTION ORIGINS",
      "title": "Beyond the garden gate",
      "question": "Where were geocoded seed accessions collected, and how much of each archive can be placed on a map?",
      "intro": "Ten licensed ALA resources include top-level accessions with coordinates. Wild origins can inform research when combined with verified species identification and seed-viability data. V10 maps Australian origins in 100 km cells, not garden or storage sites.",
      "paragraphs": [
        "Coordinates and usable years differ across archives. V12 and V13 show those gaps beside the origin and date views they qualify."
      ],
      "transition": "The final chapter weighs these records together and separates documented work from outcomes the datasets cannot measure.",
      "chartIds": [
        "V10",
        "V11",
        "V12",
        "V13"
      ],
      "chartTransitions": [
        {
          "afterChart": "V10",
          "text": "Top five 100 km cells lie in two areas: one near Perth, WA; four across southeastern Australia around Canberra, the Snowy Mountains, Blue Mountains and Illawarra. Together they hold 9,677 of 38,099 mapped records (25.4%)."
        },
        {
          "afterChart": "V11",
          "text": "The largest dated ALA decade is the 2000s, with 10,949 of 33,765 accessions. Four archives have no usable years; the histogram describes recorded dates, not year-by-year collecting."
        },
        {
          "afterChart": "V12",
          "text": "PlantBank has no map-ready coordinates for 2,921 of 12,871 accessions (22.7%). Some origins are absent because their coordinates are missing; a blank patch is not proof of no collecting. This sample may not cover every region."
        },
        {
          "afterChart": "V13",
          "text": "Four of ten ALA archives have no usable collection years. The intervals mark first and last dates on file; we can't see what happened between them, and they don't show every collecting event."
        }
      ]
    },
    {
      "id": "evidence",
      "index": "04",
      "navLabel": "What the evidence means",
      "eyebrow": "CONCLUSION & SOURCES",
      "title": "What the evidence means",
      "question": "What do the published records establish about botanical work, and where does the evidence stop?",
      "intro": "Known facilities, separate collection records and selected wild origins document parts of botanical work. They are not a complete national inventory or an outcome measure.",
      "paragraphs": [
        "PlantBank living-specimen rows, Kings Park herbarium vouchers and ALA seed accessions describe different parts of botanical collections. V10 locates a selected set of wild origins. These records can inform conservation research when paired with verified species identification and seed-viability tests; they do not show which seeds are viable, whether plants survive or whether species recover.",
        "The Australian National Botanic Gardens’ National Seed Bank describes seed testing and research. The Gardens and Royal Botanic Gardens Victoria also run school learning programs. These activities sit outside the chart data: this project has no visitor, attendance or learning-outcome measures, and the Myrtle Rust survey does not rate the archives shown."
      ],
      "transition": "Together, these records show where known facilities are registered, what selected archives document and which seed origins can be mapped. They reveal parts of botanical work, not its full reach or results.",
      "chartIds": []
    }
  ],
  takeaways: [
    "The register locates 182 known facilities, not every Australian garden or arboretum.",
    "Living specimens, preserved vouchers and seed accessions are different records.",
    "Wild-origin maps and date summaries cover only records with usable coordinates and years."
  ],
  sources: [
    {
      category: "GA",
      label: "Botanical Gardens and Arboretums register",
      publisher: "Geoscience Australia",
      url: "https://services.ga.gov.au/gis/rest/services/Botanical_Gardens_and_Arboretums/MapServer/0?f=pjson",
      license: "CC BY 4.0; fields filtered for the charts",
    },
    {
      category: "ABS",
      label: "National, state and territory population, March 2026",
      publisher: "Australian Bureau of Statistics",
      url: "https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population/mar-2026",
      license: "CC BY 4.0; ERP used as the population denominator",
    },
    {
      category: "ABS",
      label: "ASGS Edition 4 digital boundaries",
      publisher: "Australian Bureau of Statistics",
      url: "https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs/edition-4-july-2026-june-2031/access-and-downloads/digital-boundary-files",
      license: "CC BY 4.0; geometries simplified and reoriented for D3",
    },
    {
      category: "ALA",
      label: "National Seed Bank (dr21985)",
      publisher: "Atlas of Living Australia",
      url: "https://collections.ala.org.au/public/show/dr21985",
      license: "CC BY 3.0 AU; top-level accession events only",
    },
    {
      category: "ALA",
      label: "Tasmanian Seed Conservation Centre (dr21986)",
      publisher: "Atlas of Living Australia",
      url: "https://collections.ala.org.au/public/show/dr21986",
      license: "CC BY 3.0 AU; top-level accession events only",
    },
    {
      category: "ALA",
      label: "George Brown Darwin Botanic Gardens Seed Bank (dr21988)",
      publisher: "Atlas of Living Australia",
      url: "https://collections.ala.org.au/public/show/dr21988",
      license: "CC BY 3.0 AU; top-level accession events only",
    },
    {
      category: "ALA",
      label: "WA Seed Centre, Kings Park (dr21991)",
      publisher: "Atlas of Living Australia",
      url: "https://collections.ala.org.au/public/show/dr21991",
      license: "CC BY 3.0 AU; top-level accession events only",
    },
    {
      category: "ALA",
      label: "WA Seed Centre, Kensington (dr21992)",
      publisher: "Atlas of Living Australia",
      url: "https://collections.ala.org.au/public/show/dr21992",
      license: "CC BY 3.0 AU; top-level accession events only",
    },
    {
      category: "ALA",
      label: "Greening Australia (dr21993)",
      publisher: "Atlas of Living Australia",
      url: "https://collections.ala.org.au/public/show/dr21993",
      license: "CC BY 3.0 AU; top-level accession events only",
    },
    {
      category: "ALA",
      label: "Brisbane Botanic Gardens Seed Bank (dr22131)",
      publisher: "Atlas of Living Australia",
      url: "https://collections.ala.org.au/public/show/dr22131",
      license: "CC BY 3.0 AU; top-level accession events only",
    },
    {
      category: "ALA",
      label: "South Australian Seed Conservation Centre (dr23109)",
      publisher: "Atlas of Living Australia",
      url: "https://collections.ala.org.au/public/show/dr23109",
      license: "CC BY 3.0 AU; top-level accession events only",
    },
    {
      category: "ALA",
      label: "Australian PlantBank (dr23110)",
      publisher: "Atlas of Living Australia",
      url: "https://collections.ala.org.au/public/show/dr23110",
      license: "CC BY 3.0 AU; top-level accession events only",
    },
    {
      category: "ALA",
      label: "Alice Springs Desert Park (dr28420)",
      publisher: "Atlas of Living Australia",
      url: "https://collections.ala.org.au/public/show/dr28420",
      license: "CC BY 3.0 AU; top-level accession events only",
    },
    {
      category: "GBIF",
      label: "PlantBank Records dataset",
      publisher: "GBIF · Royal Botanic Gardens & Domain Trust",
      url: "https://www.gbif.org/dataset/8805b51e-d8e8-41d0-8976-d653d39c7a91",
      license: "CC BY 4.0; LIVING_SPECIMEN records only",
    },
    {
      category: "GBIF",
      label: "Kings Park Botanical Gardens dataset",
      publisher: "GBIF · WA Botanic Gardens and Parks Authority",
      url: "https://www.gbif.org/dataset/e80ff7bd-2c75-4ecb-bb5c-fde9d1bd1cd8",
      license: "CC BY 4.0; PRESERVED_SPECIMEN records only",
    },
    {
      category: "BGANZ",
      label: "Myrtle Rust survey of Australian ex situ collections · 2023 report",
      publisher: "Council of Heads of Australian Botanic Gardens (CHABG) · Botanic Gardens Australia & New Zealand (BGANZ)",
      url: "https://www.bganz.org.au/wp-content/uploads/2025/04/Myrtle-Rust-Survey-Supplemental-Final-Report-Dec-2023-Public-release.pdf",
      license: "Workbook reuse licence not established; published report cited for aggregate context only",
    },
    {
      category: "EDUCATION",
      label: "Schools and Plant Science Learning Hub",
      publisher: "Australian National Botanic Gardens · Parks Australia",
      url: "https://visit.anbg.gov.au/schools/",
      license: "Official institutional description; cited for educational programs, not chart data",
    },
    {
      category: "EDUCATION",
      label: "Botany · student plant-identification program",
      publisher: "Australian National Botanic Gardens · Parks Australia",
      url: "https://visit.anbg.gov.au/schools/ranger-guided-programs/botany/",
      license: "Official program description; cited for education context, not Kings Park data",
    },
    {
      category: "EDUCATION",
      label: "Learning with Royal Botanic Gardens Victoria",
      publisher: "Royal Botanic Gardens Victoria",
      url: "https://www.rbg.vic.gov.au/learn",
      license: "Official institutional description; cited for educational programs, not chart data",
    },
    {
      category: "CONSERVATION",
      label: "National Seed Bank: conservation and research",
      publisher: "Australian National Botanic Gardens · Parks Australia",
      url: "https://visit.anbg.gov.au/about/what-we-do/national-seed-bank/",
      license: "Official institutional description; cited for seed testing and research context, not as ALA chart data",
    }
  ],
};

pageStory.navigation = pageStory.sections.map(({ id, index, navLabel }) => ({
  href: `#${id}`,
  index,
  label: navLabel,
}));

// Reader-facing expansions of jurisdiction codes found in chart labels.
export const regionAbbreviations = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  ACT: "Australian Capital Territory",
  NT: "Northern Territory",
  OT: "Other Territories",
};

const standardJurisdictionCodes = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export const chartAbbreviationCodes = {
  V01: [...standardJurisdictionCodes, "OT"],
  V02: standardJurisdictionCodes,
  V03: standardJurisdictionCodes,
  V05: ["WA", "SA"],
  V12: ["WA", "SA"],
  V13: ["WA", "SA"],
};

// Visible chart content and asset references used by the single-page story.
export const chartCards = [
  {
    "id": "V01",
    "title": "NSW, Victoria and Queensland account for 135 of 182 known register facilities",
    "idiom": "Proportional-symbol map",
    "is_map": true,
    "spec": "specs/V01-facility-symbol-map.json",
    "data_files": [
      "data/state_rates.geojson",
      "data/v01_jurisdiction_counts.geojson"
    ],
    "source": [
      "Geoscience Australia, Botanical Gardens and Arboretums register; snapshot 14 October 2026"
    ],
    "grain": "One jurisdiction aggregate of the 182 unique known-register facility features.",
    "measure": "Known register facilities by jurisdiction; raw counts, not population-standardized rates.",
    "readerTask": "Compare jurisdiction totals before population adjustment and distinguish count symbols from individual garden locations.",
    "marks": "State polygons, one circle per jurisdiction, direct labels and short leaders for small totals.",
    "channels": "Geographic position identifies the jurisdiction; circle area encodes its facility count; text repeats the count. One symbol color carries no subtype meaning.",
    "annotation": "Circle area, not radius, encodes jurisdiction count. Anchors are representative places, not individual gardens; OT is shown near Norfolk Island."
  },
  {
    "id": "V02",
    "title": "The ACT records 12.25 known facilities per million residents",
    "idiom": "Choropleth",
    "is_map": true,
    "spec": "specs/V02-facilities-per-million-choropleth.json",
    "data_files": [
      "data/state_rates.geojson",
      "data/state_summary.csv"
    ],
    "source": [
      "Geoscience Australia register",
      "ABS ERP, March 2026",
      "ABS ASGS Edition 4 State/Territory boundaries"
    ],
    "grain": "One standard Australian state or territory; eight comparison jurisdictions.",
    "measure": "Known-register facilities per million residents at 31 March 2026; not access, travel distance or service quality.",
    "readerTask": "Compare register density without treating raw counts as equivalent across differently sized populations.",
    "marks": "State and territory polygons.",
    "channels": "Geographic position; sequential luminance for facilities per million residents.",
    "annotation": "Per-million rates divide GA counts by March 2026 ERP. The ACT leads; the measure describes register density, not public access. Other Territories stays neutral because its grouped denominator combines four areas."
  },
  {
    "id": "V03",
    "title": "ACT rises from sixth by count to first by rate",
    "idiom": "Slopegraph",
    "is_map": false,
    "spec": "specs/V03-count-rate-slopegraph.json",
    "data_files": [
      "data/state_rank_comparison.csv"
    ],
    "source": [
      "Geoscience Australia register",
      "ABS ERP, March 2026"
    ],
    "grain": "Eight standard states and territories.",
    "measure": "Ordinal rank (1 = highest); endpoint values remain available in the tooltip.",
    "readerTask": "Follow each state between raw count rank and population-standardized rank.",
    "marks": "One line per jurisdiction with distinct endpoint symbols for grayscale identification.",
    "channels": "Horizontal position for comparison measure; vertical position for rank; color and endpoint shape redundantly identify jurisdiction.",
    "annotation": "Left: rank by raw facility count; right: rank by facilities per million (1 = highest). Each line connects the same jurisdiction across the two measures."
  },
  {
    "id": "V04",
    "title": "Median footprints are similar, but one arboretum reaches 3,739 ha",
    "idiom": "Box plot",
    "is_map": false,
    "spec": "specs/V04-registered-footprint-boxplot.json",
    "data_files": [
      "data/facility_areas.csv",
      "data/facility_area_stats.json"
    ],
    "source": [
      "Geoscience Australia register"
    ],
    "grain": "One registered facility; 182 area values.",
    "measure": "Registered hectares on a logarithmic scale; the box spans the middle half of values.",
    "readerTask": "Compare typical size and spread while noticing the very large facilities.",
    "marks": "Horizontal box-and-whisker marks; the center line is the median, the box is the middle half, whiskers show the usual spread, and dots identify individual sites beyond them.",
    "channels": "Subtype on the categorical axis; logarithmic x-position for hectares; hue distinguishes Botanic Gardens from Arboreta.",
    "annotation": "The center line marks the median; the box spans the middle half; whiskers show the usual range, and dots mark outliers. Registered hectares are not planted area; the logarithmic axis keeps small and large sites visible."
  },
  {
    "id": "V05",
    "title": "ALA archives vary in published accession and taxon-ID coverage",
    "idiom": "Paired dot plot",
    "is_map": false,
    "spec": "specs/V05-seedbank-resource-profile.json",
    "data_files": [
      "data/ala_resource_profile.csv"
    ],
    "source": [
      "Ten ALA / Australian Virtual Seed Bank resources with CC BY 3.0 AU metadata"
    ],
    "grain": "Top-level accession event and distinct GBIF taxon identifier, summarized separately by resource.",
    "measure": "Indexed event and taxon-ID coverage by resource; neither measure is a total inventory or standardized species richness.",
    "readerTask": "Understand data coverage and why the mapped sample varies between contributors.",
    "marks": "Two vertically aligned horizontal dot panels, counted as one paired chart group.",
    "channels": "Resource on y; count on logarithmic x; separate x scales for accessions and taxon identifiers.",
    "annotation": "Each log-axis step is tenfold. Across ten archives, 58,562 top-level accessions appear among 119,278 event rows; linked child rows are excluded. Taxon IDs are database labels, not verified species counts or total holdings."
  },
  {
    "id": "V06",
    "title": "Eucalyptus is PlantBank’s leading recorded genus in Myrtaceae",
    "idiom": "Treemap",
    "is_map": false,
    "spec": "specs/V06-plantbank-family-treemap.json",
    "data_files": [
      "data/plantbank_family_treemap.csv"
    ],
    "source": [
      "GBIF PlantBank Records dataset, CC BY 4.0"
    ],
    "grain": "One of 10,609 occurrence rows, all marked LIVING_SPECIMEN; 10,599 have a family value.",
    "measure": "Rectangle areas partition 10,599 indexed family-identified living-specimen records; not living plants currently held.",
    "readerTask": "Inspect genuine family-to-genus nesting and composition, not an arbitrary flat ranking.",
    "marks": "Parent family rectangles frame nested genus rectangles, with quantitative area, labels and thin grouping outlines.",
    "channels": "Nested area carries record count; a categorical family colour key distinguishes groups; names identify larger tiles.",
    "annotation": "Among 10,599 family-identified LIVING_SPECIMEN records, Myrtaceae has 3,240 and 1,897 are labelled Eucalyptus. Areas encode row counts; pooled tiles are groups, not taxa or current holdings."
  },
  {
    "id": "V07",
    "title": "The 1980s contain the most dated PlantBank records",
    "idiom": "Histogram by decade",
    "is_map": false,
    "spec": "specs/V07-plantbank-date-histogram.json",
    "data_files": [
      "data/plantbank_year_histogram.csv"
    ],
    "source": [
      "GBIF PlantBank Records dataset, CC BY 4.0"
    ],
    "grain": "Individual LIVING_SPECIMEN occurrence row with a parseable year.",
    "measure": "Records with a usable year; 9,689 rows dated 1960–2015, from 10,609 total.",
    "readerTask": "See the documented span and concentration of dated records without treating them as annual additions.",
    "marks": "Contiguous histogram bars spanning numeric ten-year intervals.",
    "channels": "Quantitative decade start/end bound each bin horizontally; aligned bar height shows the count.",
    "annotation": "The 1980s peak at 4,321 dated rows. Of 10,609 records, 9,689 have usable years and 920 do not; the latest is 2015. Recorded years are not necessarily accession dates."
  },
  {
    "id": "V08",
    "title": "Myrtaceae is Kings Park’s largest named voucher family",
    "idiom": "Ranked dot plot",
    "is_map": false,
    "spec": "specs/V08-kingspark-family-records.json",
    "data_files": [
      "data/kingspark_family_records.csv"
    ],
    "source": [
      "GBIF Kings Park Botanical Gardens dataset, CC BY 4.0"
    ],
    "grain": "One of 20,647 PRESERVED_SPECIMEN occurrence rows; 20,646 have a family value.",
    "measure": "Indexed herbarium voucher records, not living garden holdings.",
    "readerTask": "See a separate research-record layer without combining it with seed accessions or living specimens.",
    "marks": "Horizontal points with direct count labels.",
    "channels": "Count on x; family on y; Myrtaceae is highlighted.",
    "annotation": "Kings Park’s 20,647 rows are PRESERVED_SPECIMEN vouchers; 4,800 are Myrtaceae, the largest named family. These are herbarium references, not living holdings; none has a usable collection year."
  },
  {
    "id": "V09",
    "title": "PlantBank Myrtaceae records peak in the 1980s",
    "idiom": "Quantitative matrix / heatmap",
    "is_map": false,
    "spec": "specs/V09-plantbank-family-decade-heatmap.json",
    "data_files": [
      "data/plantbank_family_decades.csv"
    ],
    "source": [
      "GBIF PlantBank Records dataset, CC BY 4.0"
    ],
    "grain": "Plant family × decade among 9,683 living-specimen rows with both a usable year and family.",
    "measure": "Living-specimen records with both fields; dates do not measure yearly additions.",
    "readerTask": "Compare family composition across decades without mixing herbarium or seed-bank records.",
    "marks": "Rectangular heatmap tiles with direct positive counts.",
    "channels": "Family rows, chronological decade columns, sequential fill for count.",
    "annotation": "Zero means no indexed record for that family and decade, not missing data. In the 1980s, 4,320 records span all families; 1,843 are Myrtaceae. This is archive distribution, not conservation activity."
  },
  {
    "id": "V10",
    "title": "38,099 wild seed-origin records appear in generalized map cells",
    "idiom": "Equal-area hexbin map",
    "is_map": true,
    "spec": "specs/V10-avsb-origin-hexbin.json",
    "data_files": [
      "data/state_rates.geojson",
      "data/ala_origin_hexes.geojson"
    ],
    "source": [
      "Ten ALA / Australian Virtual Seed Bank resources with CC BY 3.0 AU metadata"
    ],
    "grain": "One top-level accession event with an AU-coded usable coordinate; linked child events excluded.",
    "measure": "Top-level accession-origin records per public hexagon; 38,773 coordinates passed the map filter before cell suppression, 38,099 are in published cells.",
    "readerTask": "Recognize broad source landscapes while protecting precise collection locations.",
    "marks": "Equal-area hexagon polygons and quiet state boundaries.",
    "channels": "Projected position; sequential luminance for accession-origin count per cell.",
    "annotation": "Cells with fewer than five records are suppressed: 674 of 38,773 map-ready records. The logarithmic colour scale shows 5–2,629 records per 100 km cell. Hexagons map origins, not gardens or seed stores."
  },
  {
    "id": "V11",
    "title": "The 2000s contain the most dated ALA accession records",
    "idiom": "Histogram by decade",
    "is_map": false,
    "spec": "specs/V11-avsb-accession-years.json",
    "data_files": [
      "data/ala_year_histogram.csv",
      "data/ala_date_coverage.csv"
    ],
    "source": [
      "Ten ALA / Australian Virtual Seed Bank resources with CC BY 3.0 AU metadata"
    ],
    "grain": "Top-level accession event with a parseable year.",
    "measure": "Dated accessions only; 33,765 of 58,562 top-level records currently have a usable year.",
    "readerTask": "See the span of the dated sample without treating it as a time series of conservation activity.",
    "marks": "Contiguous histogram bars spanning numeric ten-year intervals.",
    "channels": "Quantitative decade start/end bound each bin horizontally; aligned bar height shows the count.",
    "annotation": "The histogram includes 33,765 dated top-level accessions across six resources; four have no usable years and the 2020s end in 2025. These dates are not annual collecting activity."
  },
  {
    "id": "V12",
    "title": "Map-ready coordinate coverage ranges from 0% to 100%",
    "idiom": "Horizontal bar / dot plot",
    "is_map": false,
    "spec": "specs/V12-avsb-coordinate-coverage.json",
    "data_files": [
      "data/ala_coordinate_coverage.csv"
    ],
    "source": [
      "Ten licensed ALA event archives"
    ],
    "grain": "One data resource.",
    "measure": "Percentage of top-level accession records ready for the origin map.",
    "readerTask": "Judge how uneven coordinate availability may shape the visible pattern.",
    "marks": "Horizontal bars with endpoint dots and printed percentages.",
    "channels": "Resource on y; percentage with map-ready coordinates on x.",
    "annotation": "In Australian PlantBank, 2,921 of 12,871 top-level accessions (22.7%) lack map-ready coordinates. Completeness is not geographic representativeness."
  },
  {
    "id": "V13",
    "title": "Four of ten ALA archives lack usable collection years",
    "idiom": "Interval plot",
    "is_map": false,
    "spec": "specs/V13-avsb-date-coverage.json",
    "data_files": [
      "data/ala_date_coverage.csv"
    ],
    "source": [
      "Ten licensed ALA event archives"
    ],
    "grain": "One resource summarized across top-level accessions with a usable year.",
    "measure": "Year ranges are shown for the six ALA resources with usable dates; four undated resources are named in the caption.",
    "readerTask": "Understand the limits of the combined dated-record histogram.",
    "marks": "Horizontal range rules with endpoint circles.",
    "channels": "Year on x; resource on y; rule length encodes min-to-max year span.",
    "annotation": "Four ALA archives lack usable years: Australian PlantBank, WA Seed Centre (Kensington), Alice Springs Desert Park and Greening Australia. Australian PlantBank here is the ALA resource, not V07’s GBIF PlantBank Records dataset."
  }
];
