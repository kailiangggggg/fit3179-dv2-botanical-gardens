"""Acquire the pinned public-source snapshots used by the DV2 data pipeline."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

from scripts.prepare_data import ALA_RESOURCES


ASGS_URL = (
    "https://geo.abs.gov.au/arcgis/rest/services/ASGS2026/STE/MapServer/0/query"
    "?where=1%3D1&outFields=STATE_CODE_2026%2CSTATE_NAME_2026%2CAREA_ALBERS_SQKM"
    "&returnGeometry=true&outSR=4326&f=geojson&geometryPrecision=4"
    "&maxAllowableOffset=0.005"
)

SOURCE_FILES = {
    "ga/botanical_gardens_2026-10-14.geojson": (
        "https://services.ga.gov.au/gis/rest/services/Botanical_Gardens_and_Arboretums/"
        "MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&f=geojson"
    ),
    "abs/asgs4_states_2026_0p005.geojson": ASGS_URL,
    "abs/31010do001_202603.xlsx": (
        "https://www.abs.gov.au/statistics/people/population/national-state-and-territory-"
        "population/mar-2026/31010do001_202603.xlsx"
    ),
    **{
        f"ala/{resource_id}.zip": f"https://dwca-exports.ala.org.au/{resource_id}.zip"
        for resource_id in ALA_RESOURCES
    },
    "gbif/plantbank_dr726.zip": "https://dwca-exports.ala.org.au/dr726.zip",
    "gbif/kingspark_dr22285.zip": "https://dwca-exports.ala.org.au/dr22285.zip",
}

DEFAULT_RAW_ROOT = Path(__file__).resolve().parents[2] / "data" / "raw"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def fetch_sources(raw_root: Path = DEFAULT_RAW_ROOT, verify_only: bool = False) -> dict:
    """Download only missing allowlisted inputs; never overwrite a snapshot."""
    raw_root = Path(raw_root)
    manifest_path = raw_root / "source_snapshots.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = {"snapshot_date": datetime.now(timezone.utc).date().isoformat(), "sources": []}

    entries = {entry["path"]: entry for entry in manifest.get("sources", [])}
    now = datetime.now(timezone.utc).isoformat()
    missing = []
    verified = []
    for relative_path, url in SOURCE_FILES.items():
        destination = raw_root / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        existing = entries.get(relative_path)
        if destination.exists():
            actual_hash = _sha256(destination)
            if existing and existing.get("sha256") and existing["sha256"] != actual_hash:
                raise ValueError(f"Snapshot hash mismatch for preserved file {relative_path}")
            if not existing:
                entries[relative_path] = {
                    "path": relative_path,
                    "url": url,
                    "retrieved_utc": now,
                    "bytes": destination.stat().st_size,
                    "sha256": actual_hash,
                }
            verified.append(relative_path)
            continue

        if verify_only:
            missing.append(relative_path)
            continue

        temporary = destination.with_suffix(destination.suffix + ".part")
        try:
            request = Request(url, headers={"User-Agent": "FIT3179-DV2 source acquisition/1.0"})
            with urlopen(request, timeout=120) as response, temporary.open("wb") as output:
                digest = hashlib.sha256()
                byte_count = 0
                while True:
                    block = response.read(1024 * 1024)
                    if not block:
                        break
                    output.write(block)
                    digest.update(block)
                    byte_count += len(block)
                output.flush()
            temporary.replace(destination)
            entries[relative_path] = {
                "path": relative_path,
                "url": url,
                "retrieved_utc": now,
                "bytes": byte_count,
                "sha256": digest.hexdigest(),
            }
            verified.append(relative_path)
        finally:
            if temporary.exists():
                temporary.unlink()

    if missing:
        raise FileNotFoundError("Missing pinned source snapshots: " + ", ".join(missing))

    if not verify_only:
        manifest["sources"] = sorted(entries.values(), key=lambda entry: entry["path"])
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return {"verified_sources": verified, "source_count": len(verified), "manifest": str(manifest_path)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-root", type=Path, default=DEFAULT_RAW_ROOT)
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    result = fetch_sources(args.raw_root, verify_only=args.verify_only)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
