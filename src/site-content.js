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
        "Three states contain 135 of the 182 known-register sites. Arboreta are gardens focused on trees and woody plants; graduated circles group registered areas, with exact hectares available on hover. Sydney and Melbourne detail views repeat existing sites; A — Sydney and B — Melbourne label their windows on the national map. A linear view compares 165 facilities below 100 ha.",
      paragraphs: [
        "A register entry is not a guarantee that every facility is represented. Reported hectares describe a registered footprint, not planted area, public access, the size of a collection or conservation capacity.",
      ],
      transition:
        "The register shows where known facilities sit; it cannot tell us which plants their collections document. The next chapter moves from institutions to public records.",
      chartIds: ["V01", "V02", "V03", "V04"],
      chartTransitions: [
        {
          afterChart: "V01",
          emphasis: true,
          text: "A and B locate Sydney and Melbourne; insets repeat 32 of the 182 sites. The linear 0–100 ha plot compares 165 smaller facilities and shows within-class differences. V04 keeps the full range; V02 adjusts counts for population.",
        },
        {
          afterChart: "V02",
          text: "Population is the denominator, so smaller jurisdictions can rank higher despite fewer facilities. V03 puts both rank orders side by side.",
        },
        {
          afterChart: "V03",
          text: "ACT rises from sixth by count to first per million; NT moves from tied rank 7.5 to second. This is register density, not access. V04 compares reported area.",
        },
        {
          afterChart: "V04",
          text: "Arboretum footprints span about 0.5 to 3,739 hectares; the largest lies far beyond the usual range. Reported land is not planted area or collection size.",
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
        "Ten licensed ALA seed-bank archives publish different amounts of accession and taxon metadata. V05 compares their top-level event records with distinct taxon IDs.",
        "A 2023 BGANZ/CHABG survey of 26 mixed respondent organisations recorded 45 of 49 Myrtle Rust National Action Plan priority species. This respondent baseline is not a national census or conservation-outcome measure.",
      ],
      transition:
        "Some seed-bank accessions also record collection locations. The next chapter maps those generalized origins and shows where coordinates and dates are missing.",
      chartIds: ["V05", "V06", "V07", "V08", "V09"],
      chartTransitions: [
        {
          afterChart: "V05",
          text: "Of 119,278 ALA event rows, 58,562 are top-level accessions; linked children are excluded. Taxon IDs are labels, not verified species counts or whole-bank holdings. V06 narrows to PlantBank.",
        },
        {
          afterChart: "V06",
          text: "PlantBank has 10,609 LIVING_SPECIMEN rows; 10,599 include family. A family groups genera, and “living” does not confirm current survival. V07 examines recorded years.",
        },
        {
          afterChart: "V07",
          text: "The 1980s peak is 4,321; 920 PlantBank rows lack usable years, and the 2010s end in 2015. Recorded years are not necessarily accession dates. V08 changes archive.",
        },
        {
          afterChart: "V08",
          text: "Kings Park contributes 20,647 PRESERVED_SPECIMEN vouchers; its files have no usable years and are not living holdings. V09 returns to PlantBank’s family-by-decade records.",
        },
        {
          afterChart: "V09",
          text: "The Myrtaceae–1980s peak describes dated records, not conservation effort. The next chapter maps only the geocoded seed-origin subset.",
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
        "Ten seed-bank archives include accessions with coordinates. V10 groups recorded wild collection origins into 100-kilometre equal-area cells; these are not garden sites or receiving banks.",
      paragraphs: [
        "These origin and year totals describe the licensed file snapshot, not all Australian seed collecting.",
      ],
      transition:
        "The final chapter weighs these location, collection and origin records together, while keeping their coverage limits in view.",
      chartIds: ["V10", "V11", "V12", "V13"],
      chartTransitions: [
        {
          afterChart: "V10",
          text: "Cells with fewer than five records are suppressed; the visible clusters are collection origins, not gardens or seed stores. V11 shifts to dates.",
        },
        {
          afterChart: "V11",
          text: "Available dates end at the 2025 snapshot and do not measure annual collecting effort. V12 checks geographic gaps.",
        },
        {
          afterChart: "V12",
          text: "Rates span 0% in Alice Springs to 100% in Darwin. 22.7% of the ALA Australian PlantBank archive’s top-level accessions lack map-ready coordinates; completeness is not geographic representativeness. V13 shows year spans.",
        },
        {
          afterChart: "V13",
          text: "Observed year spans are file endpoints, not continuous collecting; the conclusion brings these coverage limits beside facility locations and collection records.",
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
        "The register, public collection archives and generalized origin cells describe three different parts of botanical work. They document known sites, published records and some collection places—not the full scope of botanical conservation.",
      paragraphs: [
        "The register locates 182 known facilities and reports their registered areas. PlantBank and Kings Park publish different specimen records; ten ALA archives publish top-level seed accessions, some with generalized origins. Together they show what institutions record and make public.",
        "These sources complement one another, but they are not a unified inventory. They do not measure every garden, current holdings, public access, species recovery or conservation impact.",
        "Education is another documented role: the Australian National Botanic Gardens and Royal Botanic Gardens Victoria describe learning programs. These examples do not measure national participation or learning outcomes; see the linked official pages below.",
      ],
      transition:
        "Taken together, these records show known facilities, distinct published collections and some generalized wild origins. They document parts of botanical work, not total conservation success or national coverage.",
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
