import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


class V01JurisdictionCountDataTests(unittest.TestCase):
    def test_jurisdiction_counts_match_the_registered_facility_source(self):
        source = json.loads((PUBLIC / "data" / "state_rates.geojson").read_text(encoding="utf-8"))
        output_path = PUBLIC / "data" / "v01_jurisdiction_counts.geojson"
        self.assertTrue(output_path.is_file(), "V01 jurisdiction count data is built from the checked-in source")
        output = json.loads(output_path.read_text(encoding="utf-8"))
        source_counts = {
            feature["properties"]["state_code"]: feature["properties"]["facility_count"]
            for feature in source["features"]
        }
        output_counts = {
            feature["properties"]["state_code"]: feature["properties"]["facility_count"]
            for feature in output["features"]
        }
        self.assertEqual(output_counts, source_counts)
        self.assertEqual(len(output["features"]), 9)
        self.assertEqual(sum(output_counts.values()), 182)
        self.assertEqual(output["metadata"]["source_facility_count"], 182)
        self.assertEqual(output["metadata"]["unique_globalid_count"], 182)

    def test_count_map_never_republishes_facility_identifiers_or_area_values(self):
        path = PUBLIC / "data" / "v01_jurisdiction_counts.geojson"
        self.assertTrue(path.is_file(), "V01 jurisdiction count data is built from the checked-in source")
        output = json.loads(path.read_text(encoding="utf-8"))
        for feature in output["features"]:
            props = feature["properties"]
            self.assertNotIn("globalid", props)
            self.assertNotIn("feature_name", props)
            self.assertNotIn("area_hectares", props)
            self.assertIn("anchor_kind", props)


if __name__ == "__main__":
    unittest.main()
