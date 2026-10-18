export const pageStory = {
  title: "Beyond the Garden Gate",
  subtitle: "Mapping Australia’s gardens, plant collections and wild seed origins",
  snapshot: "14 October 2026",
  hero: {
    kicker: "AUSTRALIA · BOTANICAL CONSERVATION",
    titleLines: ["Beyond the", "Garden Gate"],
    lede:
      "A national register maps known gardens and arboreta. Public collection records offer narrower views of the plants and wild seed origins documented beyond their gates.",
    limitation:
      "These datasets reveal where plants are documented and where some seeds originated. They do not measure plant survival, species recovery or educational outcomes.",
  },
  metrics: [
    { value: "182", label: "known register features", source: "Geoscience Australia · 2026 snapshot" },
    { value: "120", label: "Botanic Gardens", source: "GA register" },
    { value: "62", label: "Arboretums", source: "GA register" },
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
      id: "footprint",
      index: "01",
      navLabel: "A national footprint",
      eyebrow: "MAP & REGISTER",
      title: "A national footprint",
      question: "Where are the known gardens and arboreta—and how do their registered sites differ?",
      intro:
        "Three states contain 135 of the 182 known-register sites. Arboreta are gardens focused on trees and woody plants; graduated circles group registered areas, with exact hectares available on hover.",
      paragraphs: [
        "A register entry is not a guarantee that every facility is represented. Reported hectares describe a registered footprint, not planted area, public access, the size of a collection or conservation capacity.",
        "Raw counts and population-standardised rates answer different questions. ACT moves from sixth by count to first by facilities per million residents; the Northern Territory moves from a tie at 7.5 to second. These rates describe register density, not how easy a garden is to reach.",
        "Registered site areas have a long tail: the Arboretum range extends from about half a hectare to 3,739 hectares. The box plot uses a logarithmic axis so the smaller sites remain visible beside the largest outlier.",
      ],
      transition:
        "The register shows where known facilities sit; it cannot tell us which plants their collections document. The next chapter moves from institutions to public records.",
      chartIds: ["V01", "V02", "V03", "V04"],
      chartTransitions: [
        {
          afterChart: "V01",
          emphasis: true,
          text: "The map shows where the register clusters. V02 adjusts for population: the ACT moves from sixth by count to first by facilities per million residents.",
        },
        {
          afterChart: "V02",
          text: "The rate map changes the comparison from raw totals to jurisdiction size. V03 places the two rank orders side by side.",
        },
        {
          afterChart: "V03",
          text: "Rank shifts describe register density; V04 changes the measure to reported hectares and shows how far the largest arboretum sits beyond the usual range.",
        },
      ],
    },
    {
      id: "records",
      index: "02",
      navLabel: "Inside the collections",
      eyebrow: "COLLECTION RECORDS",
      title: "Inside the collections",
      question: "Which plants and dates appear in the public collection datasets?",
      intro:
        "Public records describe different parts of botanical collections. A seed-bank accession is a catalogued seed collection; a herbarium voucher is a preserved reference specimen; a living-specimen record describes a plant recorded as living when observed, not necessarily today.",
      paragraphs: [
        "Ten licensed ALA seed-bank archives contain 119,278 event rows, including 58,562 top-level accessions; linked child events are excluded from the accession count. The paired view compares accessions with distinct taxon IDs—database labels, not verified species counts. Neither measure is a whole-bank inventory.",
        "PlantBank’s 10,609 records are all marked LIVING_SPECIMEN. Of these, 10,599 include a family and 9,689 a year (1960–2015). A plant family groups genera: Eucalyptus is one genus within Myrtaceae, with 1,897 of 3,240 Myrtaceae records carrying that label. The treemap shows this hierarchy; indexed rows do not count plants alive today or yearly additions.",
        "Kings Park’s GBIF archive contains 20,647 preserved herbarium records. Its family counts describe vouchers—not living plants or seed accessions—and its occurrence rows lack usable years.",
        "The published BGANZ/CHABG 2023 report surveyed 26 mixed respondent organisations; 45 of 49 Myrtle Rust National Action Plan priority species were represented. This is a respondent baseline, not a census of Australian gardens or a measure of conservation outcomes.",
      ],
      transition:
        "Some seed-bank records also include where accessions began. The next chapter maps that generalized origin subset, then shows how coordinate and date coverage varies by resource.",
      chartIds: ["V05", "V06", "V07", "V08", "V09"],
      chartTransitions: [
        {
          afterChart: "V05",
          text: "The archive comparison shows uneven record coverage. V06 narrows to PlantBank and opens its living-specimen records by family and genus.",
        },
        {
          afterChart: "V06",
          text: "The treemap shows which taxonomic groups are indexed. V07 adds the years attached to PlantBank records, not annual additions.",
        },
        {
          afterChart: "V07",
          text: "PlantBank’s dated rows are living-specimen records. V08 turns to Kings Park’s preserved herbarium vouchers, a different collection and record type.",
        },
        {
          afterChart: "V08",
          text: "Kings Park’s family counts describe vouchers without usable years. V09 returns to PlantBank and crosses family with decade where both fields are present.",
        },
      ],
    },
    {
      id: "origins",
      index: "03",
      navLabel: "Beyond the garden gate",
      eyebrow: "WILD COLLECTION ORIGINS",
      title: "Beyond the garden gate",
      question: "Where were the geocoded seed-bank accessions collected?",
      intro:
        "The map generalizes 38,099 geocoded accessions into 100-kilometre cells, making recorded wild origins visible without publishing precise locations. The cells mark collection places, not gardens or receiving seed banks.",
      paragraphs: [
        "Of the top-level accessions, 38,773 have an Australian code and coordinates inside the map extent. The equal-area 100-kilometre hexagons show 38,099 records; 674 in cells below five are suppressed.",
        "Coordinate completeness ranges from 100% in the George Brown Darwin Botanic Gardens Seed Bank archive to 0% in the Alice Springs Desert Park archive. The percentage measures metadata available in this snapshot, not how representative each resource is geographically.",
        "Only 33,765 top-level accessions have usable years, across six resources; four resources have none. The ten-year bins show dates recorded in those files, not annual collection effort. The 2020s bin is incomplete because the source snapshot stops in 2025.",
      ],
      transition:
        "These charts describe the coordinates and years available in the public archive. They do not show storage locations, collection effort or conservation outcomes.",
      chartIds: ["V10", "V11", "V12", "V13"],
      chartTransitions: [
        {
          afterChart: "V10",
          text: "The hexagons generalize mapped origins. V11 shifts from places to the recorded years on top-level accessions that can be dated.",
        },
        {
          afterChart: "V11",
          text: "The year histogram pools resources; coordinate coverage differs by contributor. V12 shows how much of each archive can enter the origin map.",
        },
        {
          afterChart: "V12",
          text: "Map-ready coordinates do not imply usable dates. V13 shows each resource’s observed year span and notes the four archives without dated roots.",
        },
      ],
    },
    {
      id: "evidence",
      index: "04",
      navLabel: "What the evidence means",
      eyebrow: "CONCLUSION & SOURCES",
      title: "What the evidence means",
      question: "What can these records tell us—and where does their evidence stop?",
      intro:
        "The register, public collection archives and generalized origin cells are three evidence layers. Together they describe known institutions, published records and some collection places—not the full scope of botanical conservation.",
      paragraphs: [
        "The register places 182 known facilities and compares their reported areas. Collection archives show which records contributors have published, while the origin map connects a geocoded subset of seed accessions to broad landscapes.",
        "These sources complement one another, but they are not a unified inventory. They do not measure every garden, current holdings, public access, species recovery or conservation impact.",
        "Education is a further contribution documented by individual gardens, though it cannot be compared nationally with these datasets. The Australian National Botanic Gardens offers guided, inquiry-based school activities and a Plant Science Learning Hub; Royal Botanic Gardens Victoria publishes nature-based learning programs from early childhood through tertiary study. These are examples of educational provision, not measured participation or learning outcomes. See their official education pages in the source list below.",
      ],
      transition:
        "Together, the records show known institutions, published collection evidence and some wild origins—while leaving the full picture of botanical conservation unresolved.",
      chartIds: [],
    },
  ],
  takeaways: [
    "The national register contains 182 known facilities, but it is not a complete census.",
    "Living specimens, preserved herbarium vouchers and seed accessions are distinct record types, not interchangeable holdings.",
    "The origin and date views cover only records with usable coordinates and years; they do not measure conservation outcomes.",
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
      publisher: "BGANZ / CHABG",
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
      label: "Learning with Royal Botanic Gardens Victoria",
      publisher: "Royal Botanic Gardens Victoria",
      url: "https://www.rbg.vic.gov.au/learn",
      license: "Official institutional description; cited for educational programs, not chart data",
    }
  ],
};

pageStory.navigation = pageStory.sections.map(({ id, index, navLabel }) => ({
  href: `#${id}`,
  index,
  label: navLabel,
}));
