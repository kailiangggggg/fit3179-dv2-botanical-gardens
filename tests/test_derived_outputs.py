from pathlib import Path
import csv
import json
import tempfile
import unittest

from scripts.prepare_data import (
    albers_forward,
    albers_inverse,
    build_ala_origin_hexes,
    build_state_rank_data,
    build_state_metrics,
    build_treemap_layout,
    load_abs_population_march_2026,
    load_asgs_boundaries,
    load_ga_features,
    prepare_public_data,
    summarize_gbif_archive,
)
from scripts.fetch_sources import SOURCE_FILES

REPO_ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = REPO_ROOT.parent / "data" / "raw"


class DerivedOutputContractTests(unittest.TestCase):
    def test_albers_projection_round_trips_australian_coordinates(self):
        for longitude, latitude in ((151.2093, -33.8688), (130.8418, -12.4634), (167.9373, -29.0246)):
            x, y = albers_forward(longitude, latitude)
            actual_longitude, actual_latitude = albers_inverse(x, y)
            self.assertAlmostEqual(actual_longitude, longitude, places=7)
            self.assertAlmostEqual(actual_latitude, latitude, places=7)

    def test_state_rates_use_march_2026_and_keep_other_territories_out_of_comparison(self):
        facilities = load_ga_features(
            RAW_ROOT / "ga" / "botanical_gardens_2026-10-14.geojson"
        )
        population = load_abs_population_march_2026(
            RAW_ROOT / "abs" / "31010do001_202603.xlsx"
        )
        boundaries = load_asgs_boundaries(
            RAW_ROOT / "abs" / "asgs4_states_generalised_2026_0p005.geojson"
        )

        metrics = build_state_metrics(facilities, population, boundaries)
        by_code = {feature["properties"]["state_code"]: feature["properties"] for feature in metrics["features"]}

        self.assertEqual(set(by_code), {"1", "2", "3", "4", "5", "6", "7", "8", "9"})
        self.assertAlmostEqual(by_code["1"]["facilities_per_million"], 50 / 8_670_105 * 1_000_000, places=9)
        self.assertEqual(by_code["9"]["facility_count"], 1)
        self.assertEqual(by_code["9"]["population"], 5_047)
        self.assertFalse(by_code["9"]["comparison_eligible"])
        self.assertIsNone(by_code["9"]["facilities_per_million"])
        self.assertEqual(by_code["1"]["state_abbreviation"], "NSW")
        self.assertIsInstance(by_code["1"]["label_longitude"], float)
        self.assertIsInstance(by_code["1"]["label_latitude"], float)

    def test_slopegraph_ranks_use_midrank_for_the_raw_count_tie(self):
        facilities = load_ga_features(
            RAW_ROOT / "ga" / "botanical_gardens_2026-10-14.geojson"
        )
        population = load_abs_population_march_2026(
            RAW_ROOT / "abs" / "31010do001_202603.xlsx"
        )
        boundaries = load_asgs_boundaries(
            RAW_ROOT / "abs" / "asgs4_states_generalised_2026_0p005.geojson"
        )
        metrics = build_state_metrics(facilities, population, boundaries)

        ranks = {row["state"]: row for row in build_state_rank_data(metrics)}
        self.assertEqual(ranks["Tasmania"]["facility_count_rank"], 7.5)
        self.assertEqual(ranks["Northern Territory"]["facility_count_rank"], 7.5)
        self.assertEqual(ranks["Australian Capital Territory"]["facility_count_rank"], 6)
        self.assertEqual(ranks["Australian Capital Territory"]["facility_rate_rank"], 1)
        self.assertEqual(ranks["Northern Territory"]["facility_rate_rank"], 2)
        self.assertEqual(ranks["Western Australia"]["facility_rate_rank"], 3)

    def test_treemap_rectangle_area_is_proportional_to_record_counts(self):
        profile = summarize_gbif_archive(RAW_ROOT / "gbif" / "plantbank_dr726.zip")
        layout = build_treemap_layout(profile["family_record_counts"], 1000, 600, top_n=12)

        total_area = 1000 * 600
        plotted_total = sum((cell["x1"] - cell["x0"]) * (cell["y1"] - cell["y0"]) for cell in layout)
        self.assertAlmostEqual(plotted_total, total_area, places=4)
        self.assertEqual(len({cell["family"] for cell in layout}), len(layout))
        self.assertAlmostEqual(
            next(cell for cell in layout if cell["family"] == "Myrtaceae")["area_share"],
            3_240 / 10_599,
            places=6,
        )

    def test_origin_hex_output_is_aggregated_and_suppresses_small_cells(self):
        boundary = load_asgs_boundaries(
            RAW_ROOT / "abs" / "asgs4_states_generalised_2026_0p005.geojson"
        )
        hexes, profile = build_ala_origin_hexes(
            RAW_ROOT / "ala", boundary, cell_width_km=100, minimum_records=5
        )

        self.assertGreater(profile["eligible_coordinate_records"], 0)
        self.assertEqual(profile["eligible_coordinate_records"], 38_773)
        self.assertGreater(profile["suppressed_records"], 0)
        self.assertTrue(all(feature["properties"]["record_count"] >= 5 for feature in hexes["features"]))
        self.assertTrue(all("decimalLatitude" not in feature["properties"] for feature in hexes["features"]))
        self.assertTrue(all("decimalLongitude" not in feature["properties"] for feature in hexes["features"]))
        self.assertTrue(all(feature["geometry"]["type"] == "Polygon" for feature in hexes["features"]))

    def test_asgs_null_outside_australia_feature_is_not_published(self):
        boundaries = load_asgs_boundaries(
            RAW_ROOT / "abs" / "asgs4_states_generalised_2026_0p005.geojson"
        )

        self.assertEqual(len(boundaries), 9)
        self.assertNotIn("Z", {feature["properties"]["STATE_CODE_2026"] for feature in boundaries})
        self.assertTrue(all(feature["geometry"] is not None for feature in boundaries))

    def test_public_data_build_is_compact_and_contains_only_aggregated_ala_origins(self):
        with tempfile.TemporaryDirectory() as directory:
            output_dir = Path(directory) / "data"
            profile = prepare_public_data(RAW_ROOT, output_dir)

            self.assertEqual(profile["ga_features"], 182)
            self.assertEqual(profile["ala_root_accessions"], 58_562)
            self.assertEqual(profile["ala_map_eligible_coordinates"], 38_773)
            self.assertEqual(profile["plantbank_basis_of_record"], "LIVING_SPECIMEN")
            self.assertEqual(profile["kingspark_basis_of_record"], "PRESERVED_SPECIMEN")
            self.assertTrue((output_dir / "state_rates.geojson").is_file())
            self.assertTrue((output_dir / "ala_origin_hexes.geojson").is_file())
            self.assertTrue((output_dir / "plantbank_family_decades.csv").is_file())
            self.assertFalse((output_dir / "bganz_institution_summary.csv").exists())
            provenance = json.loads(
                (output_dir / "source_provenance.json").read_text(encoding="utf-8")
            )
            provenance_paths = {source["path"] for source in provenance["sources"]}
            self.assertEqual(provenance_paths, set(SOURCE_FILES))

            hex_data = json.loads(
                (output_dir / "ala_origin_hexes.geojson").read_text(encoding="utf-8")
            )
            self.assertTrue(all("decimalLatitude" not in f["properties"] for f in hex_data["features"]))
            self.assertTrue(all("decimalLongitude" not in f["properties"] for f in hex_data["features"]))
            self.assertLessEqual(sum(path.stat().st_size for path in output_dir.iterdir()), 3_000_000)

            with (output_dir / "plantbank_family_treemap.csv").open(encoding="utf-8") as stream:
                treemap = list(csv.DictReader(stream))
            treemap_total = sum(int(row["record_count"]) for row in treemap)
            for row in treemap:
                expected_share = int(row["record_count"]) / treemap_total
                self.assertAlmostEqual(float(row["area_share"]), expected_share, places=6)

            with (output_dir / "plantbank_family_decades.csv").open(encoding="utf-8") as stream:
                family_decades = list(csv.DictReader(stream))
            self.assertEqual(sum(int(row["record_count"]) for row in family_decades), 9_683)


if __name__ == "__main__":
    unittest.main()
