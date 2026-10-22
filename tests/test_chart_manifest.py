from pathlib import Path
import json
import unittest


REPO_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ROOT = REPO_ROOT / "public"
EXPECTED_IDS = {
    "V01", "V02", "V03", "V04", "V05", "V06", "V07",
    "V08", "V09", "V10", "V11", "V12", "V13",
}


class ChartManifestTests(unittest.TestCase):
    def test_manifest_maps_all_twelve_plus_chart_groups_and_contracts(self):
        manifest = json.loads(
            (PUBLIC_ROOT / "specs" / "chart-manifest.json").read_text(encoding="utf-8")
        )
        charts = manifest["charts"]

        self.assertEqual({chart["id"] for chart in charts}, EXPECTED_IDS)
        self.assertEqual(manifest["rubric_chart_count"], 13)
        self.assertEqual(manifest["map_count"], 3)
        self.assertEqual(len(set(manifest["advanced_idiom_types"])), 8)
        self.assertEqual(manifest["visible_panels"], 17)

        v01 = next(chart for chart in charts if chart["id"] == "V01")
        self.assertEqual(v01["idiom"], "Spatial density contour map")
        self.assertEqual([view["id"] for view in v01["support_views"]["regional"]["maps"]], ["V01-SYD", "V01-MELB"])
        self.assertEqual(v01["support_views"]["quantitative"]["id"], "V01-AREA")
        self.assertEqual(v01["support_views"]["regional"]["profile_data_file"], "data/v01_regional_profiles.geojson")
        self.assertIn("data/v01_density_contours.geojson", v01["data_files"])
        self.assertIn("data/v01_density_summary.json", v01["data_files"])
        self.assertIn("data/v01_density_unrepresented.geojson", v01["data_files"])
        self.assertIn("data/v01_regional_profiles.geojson", v01["data_files"])
        self.assertEqual(v01["support_views"]["regional"]["area_scale"]["type"], "log")
        self.assertEqual(v01["support_views"]["regional"]["area_scale"]["domain_ha"], [0.5, 1000])

        for chart in charts:
            self.assertTrue(chart["what"]["source"])
            self.assertTrue(chart["what"]["grain"])
            self.assertTrue(chart["what"]["fields"])
            self.assertTrue(chart["what"]["transformations"])
            self.assertTrue(chart["what"]["measure"])
            self.assertTrue(chart["why"]["question"])
            self.assertTrue(chart["why"]["reader_task"])
            self.assertTrue(chart["how"]["marks"])
            self.assertTrue(chart["how"]["channels"])
            self.assertTrue(chart["how"]["aggregation"])
            self.assertTrue(chart["how"]["interaction"])
            self.assertTrue(chart["how"]["annotation"])

            spec_path = PUBLIC_ROOT / chart["spec"]
            self.assertTrue(spec_path.is_file(), chart["spec"])
            spec = json.loads(spec_path.read_text(encoding="utf-8"))
            self.assertIn("vega-lite/v5.json", spec["$schema"])
            for data_path in chart["data_files"]:
                self.assertTrue((PUBLIC_ROOT / data_path).is_file(), data_path)

            support_views = chart.get("support_views", {})
            support_specs = [
                *support_views.get("regional", {}).get("maps", []),
                *([support_views["quantitative"]] if support_views.get("quantitative") else []),
            ]
            for support_view in support_specs:
                support_spec_path = PUBLIC_ROOT / support_view["spec"]
                self.assertTrue(support_spec_path.is_file(), support_view["spec"])
                support_spec = json.loads(support_spec_path.read_text(encoding="utf-8"))
                self.assertIn("vega-lite/v5.json", support_spec["$schema"])

    def test_map_manifest_names_three_distinct_map_idioms(self):
        manifest = json.loads(
            (PUBLIC_ROOT / "specs" / "chart-manifest.json").read_text(encoding="utf-8")
        )
        maps = [chart for chart in manifest["charts"] if chart["is_map"]]

        self.assertEqual([chart["id"] for chart in maps], ["V01", "V02", "V10"])
        self.assertEqual(len({chart["idiom"] for chart in maps}), 3)
        self.assertEqual(manifest["legacy_chart_ids"]["V05"], ["V05a", "V05b"])

    def test_v01_support_views_do_not_add_chart_groups_or_map_idioms(self):
        manifest = json.loads(
            (PUBLIC_ROOT / "specs" / "chart-manifest.json").read_text(encoding="utf-8")
        )
        v01 = next(chart for chart in manifest["charts"] if chart["id"] == "V01")
        support = v01["support_views"]
        self.assertEqual(len(manifest["charts"]), 13)
        self.assertEqual(len(support["regional"]["maps"]), 2)
        self.assertEqual(
            [(view["locator"]["id"], view["locator"]["label"]) for view in support["regional"]["maps"]],
            [("A", "A — Sydney"), ("B", "B — Melbourne")],
        )
        self.assertEqual(support["regional"]["locator_data_file"], "data/v01_detail_locator_geometry.geojson")
        self.assertEqual(support["regional"]["profile_data_file"], "data/v01_regional_profiles.geojson")
        self.assertIn("50 km bandwidth", support["density"]["title"])
        self.assertEqual(support["density"]["exception_mark"]["label"], "31 sites below 0.1 at their location")
        self.assertIn("all 182 locations", support["density"]["note"])
        self.assertIn("not land area or actual botanical coverage", support["density"]["note"])
        self.assertEqual(
            [item["label"] for item in support["density"]["contours"]],
            ["0.1", "0.2", "0.4", "0.8"],
        )
        self.assertIn("data/v01_detail_locator_geometry.geojson", v01["data_files"])
        self.assertIn("tenfold change", support["regional"]["description"])
        self.assertEqual(support["quantitative"]["subset"], "0 <= area_hectares < 100")
        self.assertNotIn("V01-SYD", {chart["id"] for chart in manifest["charts"]})
        self.assertNotIn("V01-MELB", {chart["id"] for chart in manifest["charts"]})
        self.assertNotIn("V01-AREA", {chart["id"] for chart in manifest["charts"]})


if __name__ == "__main__":
    unittest.main()
