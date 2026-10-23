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
        self.assertEqual(manifest["visible_panels"], 14)
        self.assertNotIn("support_views", next(c for c in charts if c["id"] == "V01"))

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

    def test_map_manifest_names_three_distinct_map_idioms(self):
        manifest = json.loads(
            (PUBLIC_ROOT / "specs" / "chart-manifest.json").read_text(encoding="utf-8")
        )
        maps = [chart for chart in manifest["charts"] if chart["is_map"]]

        self.assertEqual([chart["id"] for chart in maps], ["V01", "V02", "V10"])
        self.assertEqual(len({chart["idiom"] for chart in maps}), 3)
        self.assertEqual(manifest["legacy_chart_ids"]["V05"], ["V05a", "V05b"])

if __name__ == "__main__":
    unittest.main()
