import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "public" / "data" / "facility_points.geojson"
DERIVED_PATH = ROOT / "public" / "data" / "facility_area_under100_beeswarm.json"


class V01BeeswarmDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.features = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))["features"]
        cls.points = json.loads(DERIVED_PATH.read_text(encoding="utf-8"))["points"]

    def test_subset_has_exactly_one_source_value_per_eligible_facility(self):
        expected = {
            feature["properties"]["globalid"]: feature["properties"]["area_hectares"]
            for feature in self.features
            if 0 <= feature["properties"]["area_hectares"] < 100
        }
        actual = {point["id"]: point["area"] for point in self.points}

        self.assertEqual(len(expected), 165)
        self.assertEqual(len(actual), 165)
        self.assertEqual(actual, expected)
        self.assertTrue(all(0 <= point["area"] < 100 for point in self.points))

    def test_beeswarm_offsets_are_numeric_and_metadata_explains_their_role(self):
        self.assertTrue(all(isinstance(point["displayY"], (int, float)) for point in self.points))
        self.assertEqual(len({point["id"] for point in self.points}), 165)
        metadata = json.loads(DERIVED_PATH.read_text(encoding="utf-8"))["metadata"]
        self.assertIn("collision-avoidance", metadata["display_y_role"])
        self.assertEqual(metadata["source_file"], "facility_points.geojson")


if __name__ == "__main__":
    unittest.main()
