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
            RAW_ROOT / "abs" / "asgs4_states_2026_0p005.geojson"
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
            RAW_ROOT / "abs" / "asgs4_states_2026_0p005.geojson"
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
            RAW_ROOT / "abs" / "asgs4_states_2026_0p005.geojson"
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
        for feature in hexes["features"]:
            ring = feature["geometry"]["coordinates"][0]
            signed_area = sum(
                ring[index][0] * ring[index + 1][1]
                - ring[index + 1][0] * ring[index][1]
                for index in range(len(ring) - 1)
            ) / 2
            self.assertLess(signed_area, -1e-12)

    def test_asgs_null_outside_australia_feature_is_not_published(self):
        boundaries = load_asgs_boundaries(
            RAW_ROOT / "abs" / "asgs4_states_2026_0p005.geojson"
        )

        self.assertEqual(len(boundaries), 9)
        self.assertNotIn("Z", {feature["properties"]["STATE_CODE_2026"] for feature in boundaries})
        self.assertTrue(all(feature["geometry"] is not None for feature in boundaries))
        nsw = next(f for f in boundaries if f["properties"]["STATE_CODE_2026"] == "1")
        longitudes = []

        def collect_longitudes(value):
            if isinstance(value, list):
                if len(value) >= 2 and all(isinstance(item, (int, float)) for item in value[:2]):
                    longitudes.append(value[0])
                else:
                    for child in value:
                        collect_longitudes(child)

        collect_longitudes(nsw["geometry"]["coordinates"])
        self.assertLessEqual(min(longitudes), 141.1)

        def signed_area(ring):
            return sum(
                ring[index][0] * ring[index + 1][1]
                - ring[index + 1][0] * ring[index][1]
                for index in range(len(ring) - 1)
            ) / 2

        for feature in boundaries:
            geometry = feature["geometry"]
            polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
            for polygon in polygons:
                outer_area = signed_area(polygon[0])
                self.assertGreater(abs(outer_area), 1e-12, feature["properties"]["STATE_NAME_2026"])
                self.assertLess(outer_area, 0, feature["properties"]["STATE_NAME_2026"])
                for hole in polygon[1:]:
                    hole_area = signed_area(hole)
                    self.assertGreater(abs(hole_area), 1e-12, feature["properties"]["STATE_NAME_2026"])
                    self.assertGreater(hole_area, 0, feature["properties"]["STATE_NAME_2026"])
                    self.assertLess(abs(hole_area), abs(outer_area), feature["properties"]["STATE_NAME_2026"])

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

            with (output_dir / "ala_resource_profile.csv").open(encoding="utf-8", newline="") as stream:
                resources = list(csv.DictReader(stream))
            self.assertEqual([int(row["resource_order"]) for row in resources], list(range(10)))
            root_counts = [int(row["root_accessions"]) for row in resources]
            self.assertEqual(root_counts, sorted(root_counts, reverse=True))

            with (output_dir / "ala_coordinate_coverage.csv").open(encoding="utf-8", newline="") as stream:
                coordinate_rows = list(csv.DictReader(stream))
            self.assertEqual([int(row["coordinate_order"]) for row in coordinate_rows], list(range(10)))
            coordinate_shares = [float(row["map_coordinate_share_pct"]) for row in coordinate_rows]
            self.assertEqual(coordinate_shares, sorted(coordinate_shares, reverse=True))

            with (output_dir / "kingspark_family_records.csv").open(encoding="utf-8", newline="") as stream:
                family_rows = list(csv.DictReader(stream))
            self.assertEqual([int(row["family_order"]) for row in family_rows], list(range(len(family_rows))))
            actual_family_order = [(int(row["record_count"]), row["family"]) for row in family_rows]
            expected_family_order = sorted(
                (item for item in actual_family_order if item[1] != "Other families"),
                key=lambda item: (-item[0], item[1]),
            )
            expected_family_order.extend(item for item in actual_family_order if item[1] == "Other families")
            self.assertEqual(actual_family_order, expected_family_order)

            with (output_dir / "plantbank_family_treemap.csv").open(encoding="utf-8") as stream:
                treemap = list(csv.DictReader(stream))
            families = [row for row in treemap if row["level"] == "family"]
            genera = [row for row in treemap if row["level"] == "genus"]
            treemap_total = sum(int(row["record_count"]) for row in genera)
            self.assertEqual(treemap_total, 10_599)
            self.assertEqual(sum(int(row["record_count"]) for row in families), treemap_total)
            self.assertEqual(next(row for row in families if row["family"] == "Myrtaceae")["record_count"], "3240")
            self.assertEqual(next(row for row in genera if row["genus"] == "Eucalyptus")["record_count"], "1897")
            pooled_families = next(row for row in genera if row["family"] == "Other families")
            self.assertEqual(pooled_families["genus"], "Remaining families")
            self.assertEqual(pooled_families["record_count"], "3692")
            for row in genera:
                expected_share = int(row["record_count"]) / treemap_total
                self.assertAlmostEqual(float(row["area_share"]), expected_share, places=6)
                parent = next(item for item in families if item["family"] == row["family"])
                parent_count = int(parent["record_count"])
                parent_area = (float(parent["x1"]) - float(parent["x0"])) * (
                    float(parent["y1"]) - float(parent["y0"])
                )
                child_area = (float(row["x1"]) - float(row["x0"])) * (
                    float(row["y1"]) - float(row["y0"])
                )
                self.assertAlmostEqual(child_area / parent_area, int(row["record_count"]) / parent_count, places=6)
                self.assertGreaterEqual(float(row["x0"]), float(parent["x0"]))
                self.assertLessEqual(float(row["x1"]), float(parent["x1"]))
                self.assertGreaterEqual(float(row["y0"]), float(parent["y0"]))
                self.assertLessEqual(float(row["y1"]), float(parent["y1"]))

            with (output_dir / "plantbank_family_decades.csv").open(encoding="utf-8") as stream:
                family_decades = list(csv.DictReader(stream))
            self.assertEqual(sum(int(row["record_count"]) for row in family_decades), 9_683)


if __name__ == "__main__":
    unittest.main()
