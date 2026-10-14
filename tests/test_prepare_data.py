from pathlib import Path
import unittest

from scripts.prepare_data import (
    build_family_decade_matrix,
    load_abs_population_march_2026,
    load_ga_features,
    summarize_ala_archive,
    summarize_ala_resources,
    summarize_gbif_archive,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = REPO_ROOT.parent / "data" / "raw"


class SourcePreparationContractTests(unittest.TestCase):
    def test_ala_profile_counts_only_top_level_accessions_as_accessions(self):
        profile = summarize_ala_archive(RAW_ROOT / "ala" / "dr21985.zip")

        self.assertEqual(profile["total_event_rows"], 31_433)
        self.assertEqual(profile["root_accessions"], 16_323)
        self.assertEqual(profile["child_event_rows"], 15_110)
        self.assertEqual(profile["root_valid_coordinate_pairs"], 14_315)
        self.assertEqual(profile["root_au_coordinate_pairs"], 14_303)
        self.assertEqual(profile["root_map_eligible_coordinates"], 14_218)
        self.assertEqual(profile["root_dated_records"], 14_038)
        self.assertEqual(profile["root_year_min"], 1972)
        self.assertEqual(profile["root_year_max"], 2025)

    def test_licensed_ala_snapshot_excludes_noncommercial_resource_and_separates_children(self):
        profile = summarize_ala_resources(RAW_ROOT / "ala")

        self.assertEqual(profile["resource_count"], 10)
        self.assertEqual(profile["total_event_rows"], 119_278)
        self.assertEqual(profile["root_accessions"], 58_562)
        self.assertEqual(profile["child_event_rows"], 60_716)
        self.assertEqual(profile["root_valid_coordinate_pairs"], 38_939)
        self.assertEqual(profile["root_map_eligible_coordinates"], 38_773)
        self.assertEqual(profile["root_dated_records"], 33_765)
        self.assertNotIn("dr21987", profile["resources"])

    def test_latest_abs_snapshot_keeps_norfolk_in_other_territories(self):
        population = load_abs_population_march_2026(
            RAW_ROOT / "abs" / "31010do001_202603.xlsx"
        )

        self.assertEqual(population["New South Wales"], 8_670_105)
        self.assertEqual(population["Australian Capital Territory"], 489_668)
        self.assertEqual(population["Other Territories"], 5_047)

    def test_geoscience_australia_snapshot_retains_all_known_facilities(self):
        facilities = load_ga_features(
            RAW_ROOT / "ga" / "botanical_gardens_2026-10-14.geojson"
        )

        self.assertEqual(len(facilities), 182)
        self.assertEqual(
            sum(row["feature_subtype"] == "Botanic Garden" for row in facilities), 120
        )
        self.assertEqual(
            sum(row["feature_subtype"] == "Arboretum" for row in facilities), 62
        )
        norfolk = [row for row in facilities if row["state"] == "OT"]
        self.assertEqual(len(norfolk), 1)
        self.assertEqual(norfolk[0]["feature_name"], "Norfolk Island Botanic Gardens")

    def test_gbif_record_types_are_not_mixed(self):
        plantbank = summarize_gbif_archive(RAW_ROOT / "gbif" / "plantbank_dr726.zip")
        kings_park = summarize_gbif_archive(RAW_ROOT / "gbif" / "kingspark_dr22285.zip")

        self.assertEqual(plantbank["record_count"], 10_609)
        self.assertEqual(plantbank["basis_of_record"], {"LIVING_SPECIMEN": 10_609})
        self.assertEqual(plantbank["year_count"], 9_689)
        self.assertEqual(plantbank["year_min"], 1960)
        self.assertEqual(plantbank["year_max"], 2015)
        self.assertEqual(sum(plantbank["family_decade_counts"].values()), 9_683)
        self.assertEqual(plantbank["family_decade_counts"][("Myrtaceae", 1980)], 1_843)

        matrix = build_family_decade_matrix(plantbank, top_n=10)
        self.assertEqual(sum(row["record_count"] for row in matrix), 9_683)
        self.assertEqual(
            next(
                row["record_count"]
                for row in matrix
                if row["family"] == "Myrtaceae" and row["decade"] == 1980
            ),
            1_843,
        )
        self.assertEqual(kings_park["record_count"], 20_647)
        self.assertEqual(kings_park["basis_of_record"], {"PRESERVED_SPECIMEN": 20_647})
        self.assertEqual(kings_park["year_count"], 0)


if __name__ == "__main__":
    unittest.main()
