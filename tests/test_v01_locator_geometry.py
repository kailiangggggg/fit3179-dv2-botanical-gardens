import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "public" / "specs" / "chart-manifest.json"
LOCATOR_PATH = ROOT / "public" / "data" / "v01_detail_locator_geometry.geojson"
SOURCE_POINTS_PATH = ROOT / "public" / "data" / "facility_points.geojson"


class V01LocatorGeometryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        cls.regional = manifest["charts"][0]["support_views"]["regional"]
        locator_ids = {"V01-SYD": "A", "V01-MELB": "B"}
        cls.maps = {locator_ids[view["id"]]: view for view in cls.regional["maps"]}
        cls.source_points = json.loads(SOURCE_POINTS_PATH.read_text(encoding="utf-8"))["features"]

    def load_locator_data(self):
        self.assertTrue(LOCATOR_PATH.exists(), "Build and publish locator GeoJSON from the manifest bounds.")
        return json.loads(LOCATOR_PATH.read_text(encoding="utf-8"))

    def test_locator_geojson_has_one_anchor_leader_and_label_for_each_view(self):
        features = self.load_locator_data()["features"]
        by_kind = {}
        for feature in features:
            by_kind.setdefault(feature["properties"]["kind"], []).append(feature)

        self.assertEqual(len(features), 6)
        for kind in ("anchor", "leader", "label"):
            self.assertEqual(
                {feature["properties"]["locator_id"] for feature in by_kind[kind]},
                {"A", "B"},
            )

        labels = {
            feature["properties"]["locator_id"]: feature["properties"]["label"]
            for feature in by_kind["label"]
        }
        self.assertEqual(labels, {"A": "A — Sydney", "B": "B — Melbourne"})
        self.assertEqual(
            {feature["properties"]["locator_id"]: feature["properties"]["place_label"] for feature in by_kind["label"]},
            {"A": "A — Sydney", "B": "B — Melbourne"},
        )

    def test_anchor_points_are_the_exact_centres_of_the_manifest_view_bounds(self):
        anchors = {
            feature["properties"]["locator_id"]: feature
            for feature in self.load_locator_data()["features"]
            if feature["properties"]["kind"] == "anchor"
        }

        for locator_id, view in self.maps.items():
            anchor = anchors[locator_id]
            self.assertEqual(anchor["geometry"]["type"], "Point")
            self.assertEqual(anchor["properties"]["bounds"], view["bounds"])
            west, east = view["bounds"]["longitude"]
            south, north = view["bounds"]["latitude"]
            self.assertEqual(anchor["geometry"]["coordinates"], [(west + east) / 2, (south + north) / 2])

    def test_leaders_start_at_the_window_centre_and_end_at_the_matching_label(self):
        features = self.load_locator_data()["features"]
        leaders = {
            feature["properties"]["locator_id"]: feature
            for feature in features
            if feature["properties"]["kind"] == "leader"
        }
        labels = {
            feature["properties"]["locator_id"]: feature
            for feature in features
            if feature["properties"]["kind"] == "label"
        }

        for locator_id, view in self.maps.items():
            leader = leaders[locator_id]
            self.assertEqual(leader["geometry"]["type"], "LineString")
            start, end = leader["geometry"]["coordinates"]
            west, east = view["bounds"]["longitude"]
            south, north = view["bounds"]["latitude"]
            self.assertEqual(start, [(west + east) / 2, (south + north) / 2])
            self.assertEqual(end, labels[locator_id]["geometry"]["coordinates"])
            self.assertEqual(leader["properties"]["label"], view["locator"]["label"])

    def test_locator_annotations_do_not_change_the_facility_source_or_count(self):
        features = self.load_locator_data()["features"]
        self.assertEqual(len(self.source_points), 182)
        self.assertEqual(len({point["properties"]["globalid"] for point in self.source_points}), 182)
        self.assertTrue(all("globalid" not in feature["properties"] for feature in features))
        self.assertEqual({view["locator"]["label"] for view in self.maps.values()}, {"A — Sydney", "B — Melbourne"})

    def test_callout_alignment_is_chosen_to_keep_labels_outside_dense_facility_marks(self):
        labels = {
            feature["properties"]["locator_id"]: feature
            for feature in self.load_locator_data()["features"]
            if feature["properties"]["kind"] == "label"
        }
        self.assertEqual(labels["A"]["properties"]["label_align"], "left")
        self.assertEqual(labels["B"]["properties"]["label_align"], "right")


if __name__ == "__main__":
    unittest.main()
