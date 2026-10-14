import unittest

from scripts.fetch_sources import SOURCE_FILES
from scripts.prepare_data import ALA_RESOURCES


class SourceManifestTests(unittest.TestCase):
    def test_download_allowlist_contains_only_the_ten_cc_by_ala_resources(self):
        ala_paths = [path for path in SOURCE_FILES if path.startswith("ala/")]
        ala_ids = {path.rsplit("/", 1)[1].removesuffix(".zip") for path in ala_paths}

        self.assertEqual(len(ala_paths), 10)
        self.assertEqual(ala_ids, set(ALA_RESOURCES))
        self.assertNotIn("dr21987", ala_ids)

    def test_source_allowlist_uses_current_abs_population_and_reduced_asgs_geometry(self):
        self.assertIn("abs/31010do001_202603.xlsx", SOURCE_FILES)
        self.assertIn("abs/asgs4_states_2026_0p005.geojson", SOURCE_FILES)
        self.assertIn("MapServer/0/query", SOURCE_FILES["abs/asgs4_states_2026_0p005.geojson"])
        self.assertIn("maxAllowableOffset=0.005", SOURCE_FILES["abs/asgs4_states_2026_0p005.geojson"])
        self.assertFalse(any("bganz_myrtle_rust_database_2023" in path for path in SOURCE_FILES))


if __name__ == "__main__":
    unittest.main()
