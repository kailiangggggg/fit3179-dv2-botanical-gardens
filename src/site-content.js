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
    "lede": "Australia’s gardens and arboreta are known places; public records also describe living specimens, preserved vouchers and seeds collected in the wild.",
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
          "text": "The symbols show raw jurisdiction counts. V02 divides those totals by each jurisdiction’s March 2026 population."
        },
        {
          "afterChart": "V02",
          "text": "Rates reorder jurisdictions because population sizes differ. V03 compares each jurisdiction’s count rank with its rate rank."
        },
        {
          "afterChart": "V03",
          "text": "ACT rises from sixth by count to first per million, while NT moves from tied rank 7.5 to second. These are register rates, not access; V04 compares reported footprints."
        },
        {
          "afterChart": "V04",
          "text": "Median registered footprints are similar, while the largest arboretum reaches 3,739 ha. The next chapter turns to collection records."
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
          "text": "The ten resources contain 58,562 top-level accessions among 119,278 event rows; linked child rows are excluded. Taxon IDs are database labels, not verified species. V06 narrows to PlantBank."
        },
        {
          "afterChart": "V06",
          "text": "Among 10,599 family-identified records, Myrtaceae has 3,240 and Eucalyptus 1,897. Living describes the recorded basis, not current survival. V07 turns to recorded years."
        },
        {
          "afterChart": "V07",
          "text": "The 1980s peak at 4,321 dated rows. Another 920 PlantBank rows lack usable years, and the latest is 2015; these are not necessarily accession dates. V08 changes archive."
        },
        {
          "afterChart": "V08",
          "text": "Kings Park’s rows are preserved herbarium vouchers, not living specimens; its archive has no usable years. V09 returns to PlantBank."
        },
        {
          "afterChart": "V09",
          "text": "Among 9,683 rows with family and year, 1,843 Myrtaceae records are dated to the 1980s. This is a record pattern, not conservation effort. Next: wild origins."
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
      "intro": "Ten licensed ALA resources contain top-level seed accessions with recorded coordinates. V10 aggregates Australian collection origins into 100 km equal-area cells; it maps where seeds were collected, not garden locations or storage sites.",
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
          "text": "Of 38,773 map-ready records, published cells show 38,099; another 674 in cells under five are suppressed. These are collection origins, not gardens or banks. V11 turns to dates."
        },
        {
          "afterChart": "V11",
          "text": "The 2000s contain 10,949 of 33,765 dated accessions. Four archives have no usable years; the 2020s end in 2025. V12 checks coordinate coverage."
        },
        {
          "afterChart": "V12",
          "text": "Coordinate availability varies. Australian PlantBank lacks map-ready coordinates for 2,921 of 12,871 top-level accessions (22.7%). Completeness is not geographic representativeness. V13 checks dates."
        },
        {
          "afterChart": "V13",
          "text": "Four of ten archives have no usable collection year. The displayed endpoints describe files, not uninterrupted collecting; these gaps qualify both the map and histogram."
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
        "Gardens and arboreta can maintain living collections; herbaria preserve reference specimens; seed banks store catalogued accessions; education programs share plant knowledge. These are distinct activities, and this project measures none of their national outcomes.",
        "The 2023 BGANZ/CHABG survey reported 45 of 49 Myrtle Rust National Action Plan priority species in responding collections. Its 26 respondents were mixed organisations, so this is survey context, not national coverage or proof of conservation effectiveness. The Australian National Botanic Gardens and Royal Botanic Gardens Victoria describe school and learning programs; those pages do not measure participation or impact.",
        "The register is not a complete census. GBIF records cover selected datasets, while ALA coordinates and dates are uneven. These sources cannot establish current plant survival, public access, species recovery, conservation success or education outcomes."
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
