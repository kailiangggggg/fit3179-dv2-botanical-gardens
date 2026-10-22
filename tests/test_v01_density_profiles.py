from __future__ import annotations

import hashlib
import json
import math
import re
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
DATA = PUBLIC / "data"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


class V01DensityProfileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source_text = (DATA / "facility_points.geojson").read_text(encoding="utf-8")
        cls.source = json.loads(cls.source_text)
        cls.source_features = cls.source["features"]
        cls.source_by_id = {
            feature["properties"]["globalid"]: feature for feature in cls.source_features
        }
        cls.profiles = read_json(DATA / "v01_regional_profiles.geojson")
        cls.profile_features = cls.profiles["features"]
        cls.facility_profiles = [
            feature for feature in cls.profile_features
            if feature["properties"]["kind"] == "facility"
        ]
        cls.contours = read_json(DATA / "v01_density_contours.geojson")
        cls.unrepresented = read_json(DATA / "v01_density_unrepresented.geojson")
        cls.unrepresented_features = cls.unrepresented["features"]
        cls.summary = read_json(DATA / "v01_density_summary.json")
        cls.manifest = read_json(PUBLIC / "specs" / "chart-manifest.json")
        cls.v01 = next(chart for chart in cls.manifest["charts"] if chart["id"] == "V01")

    def test_all_182_source_records_and_original_coordinates_are_preserved(self):
        self.assertEqual(len(self.source_features), 182)
        self.assertEqual(len(self.source_by_id), 182)
        self.assertEqual(len(self.facility_profiles), 32)
        self.assertEqual(len({feature["properties"]["globalid"] for feature in self.facility_profiles}), 32)
        self.assertEqual(len(self.unrepresented_features), 31)
        self.assertEqual(self.unrepresented["metadata"]["source_facility_count"], 182)
        self.assertEqual(self.unrepresented["metadata"]["marked_facility_count"], 31)
        self.assertEqual(self.unrepresented["metadata"]["selected_bandwidth_km"], 50)
        self.assertEqual(
            {feature["properties"]["globalid"] for feature in self.unrepresented_features},
            set(self.summary["facilities_below_lowest_contour_globalids"]),
        )

        for profile in self.facility_profiles:
            properties = profile["properties"]
            source = self.source_by_id[properties["globalid"]]
            self.assertEqual(profile["geometry"]["coordinates"], source["geometry"]["coordinates"])
            self.assertEqual(properties["longitude"], source["properties"]["longitude"])
            self.assertEqual(properties["latitude"], source["properties"]["latitude"])
            self.assertEqual(properties["area_hectares"], source["properties"]["area_hectares"])
            self.assertEqual(properties["feature_name"], source["properties"]["feature_name"])
            self.assertEqual(properties["feature_subtype"], source["properties"]["feature_subtype"])

        for marked in self.unrepresented_features:
            source = self.source_by_id[marked["properties"]["globalid"]]
            self.assertEqual(marked["geometry"]["coordinates"], source["geometry"]["coordinates"])
            self.assertEqual(marked["properties"]["area_hectares"], source["properties"]["area_hectares"])
            marker = '"globalid":"' + marked["properties"]["globalid"] + '"'
            start = self.source_text.index(marker)
            token = re.search(
                r'"area_hectares"\s*:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)',
                self.source_text[start : start + 1600],
            ).group(1)
            self.assertEqual(marked["properties"]["area_text"], token)
            self.assertLess(marked["properties"]["density_at_location_sites_per_1000_projected_km2"], 0.1)

    def test_regional_membership_and_ids_are_stable_from_globalid_order(self):
        cases = [
            ("Sydney", "S", 14, (150.6, 151.4, -34.2, -33.5)),
            ("Melbourne", "M", 18, (144.55, 145.4, -38.25, -37.55)),
        ]
        for region, prefix, expected_count, bounds in cases:
            west, east, south, north = bounds
            expected = sorted(
                (
                    feature for feature in self.source_features
                    if west <= feature["properties"]["longitude"] <= east
                    and south <= feature["properties"]["latitude"] <= north
                ),
                key=lambda feature: feature["properties"]["globalid"].upper(),
            )
            actual = sorted(
                (
                    feature for feature in self.facility_profiles
                    if feature["properties"]["region"] == region
                ),
                key=lambda feature: feature["properties"]["short_id"],
            )
            self.assertEqual(len(expected), expected_count)
            self.assertEqual(len(actual), expected_count)
            for index, (source, profile) in enumerate(zip(expected, actual), start=1):
                self.assertEqual(profile["properties"]["short_id"], f"{prefix}{index:02}")
                self.assertEqual(profile["properties"]["globalid"], source["properties"]["globalid"])
                self.assertTrue(
                    profile["properties"]["display_label"].startswith(
                        profile["properties"]["short_id"] + " · " + source["properties"]["feature_name"]
                    )
                )
                lines = [
                    profile["properties"]["display_label_line1"],
                    profile["properties"]["display_label_line2"],
                ]
                self.assertEqual(" ".join(line for line in lines if line), profile["properties"]["display_label"])
                self.assertTrue(all(len(line) <= 30 for line in lines))

    def test_visible_area_strings_preserve_the_source_json_decimal_tokens(self):
        for profile in self.facility_profiles:
            global_id = profile["properties"]["globalid"]
            marker = '"globalid":"' + global_id + '"'
            start = self.source_text.index(marker)
            match = re.search(
                r'"area_hectares"\s*:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)',
                self.source_text[start : start + 1600],
            )
            self.assertIsNotNone(match)
            self.assertEqual(profile["properties"]["area_text"], match.group(1))
            hectares = float(match.group(1))
            precision = 2 if hectares < 10 else 1
            self.assertEqual(profile["properties"]["area_label"], f"{hectares:.{precision}f} ha")

    def test_regional_map_coordinates_are_derived_from_original_lon_lat(self):
        radius_km = 6371.0088
        for profile in self.facility_profiles:
            longitude = profile["properties"]["longitude"]
            latitude = math.radians(profile["properties"]["latitude"])
            expected_x = radius_km * math.radians(longitude)
            expected_y = radius_km * math.log(math.tan(math.pi / 4 + latitude / 2))
            self.assertAlmostEqual(profile["properties"]["x_km"], expected_x, places=8)
            self.assertAlmostEqual(profile["properties"]["y_km"], expected_y, places=8)

    def test_density_summary_documents_bandwidth_projection_clipping_and_remote_sites(self):
        self.assertEqual(self.summary["source_facility_count"], 182)
        self.assertEqual(self.summary["unique_globalid_count"], 182)
        self.assertEqual(self.summary["selected_bandwidth_km"], 50)
        self.assertEqual(self.summary["bandwidths_km"], [25, 50, 100])
        self.assertEqual(self.summary["grid_cell_km"], 15)
        self.assertEqual(
            self.summary["contour_levels_sites_per_1000_projected_km2"],
            [0.1, 0.2, 0.4, 0.8],
        )
        self.assertEqual(self.summary["projection"]["name"], "Spherical azimuthal equidistant")
        self.assertEqual(self.summary["projection"]["center_longitude_latitude"], [133.7751, -25.2744])
        self.assertLess(self.summary["projection"]["maximum_radial_tangential_scale_factor"], 1.1)
        self.assertIn("no coastal edge correction", self.summary["coastal_clipping"])
        self.assertIn("Norfolk Island", self.summary["remote_site_note"])
        self.assertIn("not facility boundaries", self.summary["remote_site_note"])
        self.assertIn("land-area estimates", self.summary["remote_site_note"])
        self.assertIn("complete-census surface", self.summary["remote_site_note"])
        self.assertIn("area_by_level_note", self.summary)
        self.assertIn("approximate area of rasterized land cells", self.summary["area_by_level_note"])
        self.assertIn("not registered facility land area or botanical coverage", self.summary["area_by_level_note"])

        sensitivities = self.summary["bandwidth_sensitivity"]
        self.assertEqual([item["bandwidth_km"] for item in sensitivities], [25, 50, 100])
        self.assertGreater(
            sensitivities[0]["peak_sites_per_1000_projected_km2"],
            sensitivities[1]["peak_sites_per_1000_projected_km2"],
        )
        self.assertGreater(
            sensitivities[1]["peak_sites_per_1000_projected_km2"],
            sensitivities[2]["peak_sites_per_1000_projected_km2"],
        )
        self.assertEqual(
            [
                item["facilities_below_lowest_contour_at_their_location"]
                for item in sensitivities
            ],
            [0, 31, 52],
        )
        self.assertEqual(self.summary["facilities_below_lowest_contour_at_selected_bandwidth"], 31)

    def test_contour_output_matches_the_selected_bandwidth_and_has_no_area_encoding(self):
        features = self.contours["features"]
        self.assertEqual(len(features), self.summary["output_contour_segments"])
        self.assertEqual(len(features), 909)
        expected_levels = set(self.summary["contour_levels_sites_per_1000_projected_km2"])
        counts = {level: 0 for level in expected_levels}
        for feature in features:
            properties = feature["properties"]
            level = properties["density_sites_per_1000_projected_km2"]
            self.assertEqual(properties["kind"], "density-contour")
            self.assertEqual(properties["bandwidth_km"], 50)
            self.assertEqual(properties["grid_cell_km"], 15)
            self.assertIn(level, expected_levels)
            self.assertNotIn("area_hectares", properties)
            self.assertEqual(feature["geometry"]["type"], "LineString")
            self.assertEqual(len(feature["geometry"]["coordinates"]), 2)
            self.assertTrue(
                all(
                    math.isfinite(value)
                    for coordinate in feature["geometry"]["coordinates"]
                    for value in coordinate
                )
            )
            counts[level] += 1
        self.assertEqual(
            counts,
            {
                float(level): self.summary["bandwidth_sensitivity"][1]["contour_segments_by_level"][str(level)]
                for level in expected_levels
            },
        )

    def test_manifest_retains_group_map_and_advanced_idiom_counts(self):
        self.assertEqual(len(self.manifest["charts"]), 13)
        self.assertEqual(self.manifest["rubric_chart_count"], 13)
        self.assertEqual(self.manifest["map_count"], 3)
        self.assertEqual(len(set(self.manifest["advanced_idiom_types"])), 8)
        self.assertEqual(self.v01["idiom"], "Spatial density contour map")
        self.assertEqual(self.v01["support_views"]["regional"]["area_scale"]["type"], "log")
        self.assertEqual(self.v01["support_views"]["regional"]["area_scale"]["domain_ha"], [0.5, 1000])
        self.assertIn("tenfold change", self.v01["support_views"]["regional"]["description"])
        self.assertIn("data/v01_density_unrepresented.geojson", self.v01["data_files"])
        self.assertEqual(
            [chart["id"] for chart in self.manifest["charts"]],
            ["V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08", "V09", "V10", "V11", "V12", "V13"],
        )
        self.assertEqual(self.v01["support_views"]["quantitative"]["subset"], "0 <= area_hectares < 100")

    def test_v01_method_notes_ground_contours_in_week9_and_distinguish_map_idioms(self):
        notes = (ROOT / "docs" / "sources-and-methods.md").read_text(encoding="utf-8")
        self.assertIn("Each contour line connects places with the same estimated site concentration.", notes)
        self.assertIn("FIT3179 Week 9", notes)
        self.assertRegex(notes.lower(), r"scalar[- ]field")
        self.assertIn("V02", notes)
        self.assertIn("V10", notes)
        self.assertIn("50 km", notes)
        self.assertIn("15 km", notes)
        self.assertNotRegex(notes.lower(), r"graduated[- ]symbol")
        self.assertIn("same estimated site concentration", self.v01["how"]["marks"].lower())
        self.assertIn("V02", notes)
        self.assertIn("V10", notes)

    def test_density_and_profile_outputs_rebuild_byte_for_byte(self):
        paths = [
            DATA / "v01_density_contours.geojson",
            DATA / "v01_density_summary.json",
            DATA / "v01_density_unrepresented.geojson",
            DATA / "v01_regional_profiles.geojson",
        ]

        def digests():
            return {
                path.name: hashlib.sha256(path.read_bytes()).hexdigest()
                for path in paths
            }

        before = digests()
        subprocess.run(
            ["node", "scripts/build_v01_density_profiles.mjs"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        self.assertEqual(digests(), before)


if __name__ == "__main__":
    unittest.main()
