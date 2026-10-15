"""Read licensed DV2 source snapshots and derive chart-ready summaries."""

from __future__ import annotations

import argparse
import csv
import io
import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Iterator
from xml.etree import ElementTree
from zipfile import ZipFile

ALA_RESOURCES = {
    "dr21985": "National Seed Bank",
    "dr21986": "Tasmanian Seed Conservation Centre",
    "dr21988": "George Brown Darwin Botanic Gardens Seed Bank",
    "dr21991": "WA Seed Centre (Kings Park)",
    "dr21992": "WA Seed Centre (Kensington)",
    "dr21993": "Greening Australia",
    "dr22131": "Brisbane Botanic Gardens Seed Bank",
    "dr23109": "South Australian Seed Conservation Centre",
    "dr23110": "Australian PlantBank",
    "dr28420": "Alice Springs Desert Park",
}

ALA_RESOURCE_SHORT = {
    "dr21985": "National Seed Bank",
    "dr21986": "Tasmania Seed Centre",
    "dr21988": "Darwin Botanic Seed Bank",
    "dr21991": "WA Seed Centre · Kings Park",
    "dr21992": "WA Seed Centre · Kensington",
    "dr21993": "Greening Australia",
    "dr22131": "Brisbane Botanic Seed Bank",
    "dr23109": "SA Seed Conservation Centre",
    "dr23110": "Australian PlantBank",
    "dr28420": "Alice Springs Desert Park",
}

ALA_RESOURCE_URL = "https://collections.ala.org.au/public/show/{resource_id}"
ALA_LICENSE = "CC BY 3.0 AU"
ALA_LICENSE_URL = "https://creativecommons.org/licenses/by/3.0/au/"

GBIF_DATASETS = {
    "plantbank": {
        "title": "PlantBank Records",
        "dataset_key": "8805b51e-d8e8-41d0-8976-d653d39c7a91",
        "archive": "plantbank_dr726.zip",
        "row_type": "Occurrence",
        "basis_of_record": "LIVING_SPECIMEN",
        "license": "CC BY 4.0",
        "url": "https://www.gbif.org/dataset/8805b51e-d8e8-41d0-8976-d653d39c7a91",
    },
    "kingspark": {
        "title": "Kings Park Botanical Gardens",
        "dataset_key": "e80ff7bd-2c75-4ecb-bb5c-fde9d1bd1cd8",
        "archive": "kingspark_dr22285.zip",
        "row_type": "Occurrence",
        "basis_of_record": "PRESERVED_SPECIMEN",
        "license": "CC BY 4.0",
        "url": "https://www.gbif.org/dataset/e80ff7bd-2c75-4ecb-bb5c-fde9d1bd1cd8",
    },
}

PRODUCTION_SOURCE_PATHS = [
    "ga/botanical_gardens_2026-10-14.geojson",
    "abs/asgs4_states_2026_0p005.geojson",
    "abs/31010do001_202603.xlsx",
    *[f"ala/{resource_id}.zip" for resource_id in ALA_RESOURCES],
    "gbif/plantbank_dr726.zip",
    "gbif/kingspark_dr22285.zip",
]

DWCA_NS = {"dwc": "http://rs.tdwg.org/dwc/text/"}
AU_LATITUDE_RANGE = (-45.0, -8.0)
AU_LONGITUDE_RANGE = (96.0, 169.0)


def _decode_delimiter(value: str) -> str:
    """Decode the common escaped separators used in Darwin Core metadata."""
    return {r"\t": "\t", r"\n": "\n", r"\r": "\r"}.get(value, value)


def _dwca_core_rows(path: Path) -> Iterator[tuple[list[str], dict[str, str]]]:
    """Yield Darwin Core core rows with terms mapped from meta.xml."""
    with ZipFile(path) as archive:
        metadata = ElementTree.fromstring(archive.read("meta.xml"))
        core = metadata.find("dwc:core", DWCA_NS)
        if core is None:
            raise ValueError(f"No Darwin Core core table in {path}")

        location = core.findtext("dwc:files/dwc:location", namespaces=DWCA_NS)
        if not location:
            raise ValueError(f"No core file location in {path}")

        fields = sorted(
            (
                int(field.attrib["index"]),
                field.attrib["term"].rsplit("/", 1)[-1],
            )
            for field in core.findall("dwc:field", DWCA_NS)
        )
        names = [name for _, name in fields]
        delimiter = _decode_delimiter(core.attrib.get("fieldsTerminatedBy", "\t"))
        quote_char = core.attrib.get("fieldsEnclosedBy", '"').replace("&quot;", '"')
        skip_rows = int(core.attrib.get("ignoreHeaderLines", "0"))
        encoding = core.attrib.get("encoding", "UTF-8")

        with archive.open(location) as stream:
            text_stream = io.TextIOWrapper(stream, encoding=encoding, newline="")
            reader = csv.reader(text_stream, delimiter=delimiter, quotechar=quote_char)
            for _ in range(skip_rows):
                next(reader, None)
            for values in reader:
                if not values:
                    continue
                yield names, {
                    name: values[index].strip()
                    for index, name in fields
                    if index < len(values) and values[index]
                }


def _year_from_record(record: dict[str, str]) -> int | None:
    """Read a usable four-digit year from Darwin Core year or eventDate."""
    year_text = record.get("year", "").strip()
    if year_text:
        match = re.match(r"^(\d{4})", year_text)
    else:
        match = re.search(r"\b(18\d{2}|19\d{2}|20\d{2})\b", record.get("eventDate", ""))
    if not match:
        return None
    year = int(match.group(1))
    return year if 1800 <= year <= 2026 else None


def _coordinate_pair(record: dict[str, str]) -> tuple[float, float] | None:
    try:
        latitude = float(record.get("decimalLatitude", ""))
        longitude = float(record.get("decimalLongitude", ""))
    except (TypeError, ValueError):
        return None
    if not math.isfinite(latitude) or not math.isfinite(longitude):
        return None
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        return None
    return latitude, longitude


def _is_root_accession(record: dict[str, str]) -> bool:
    return not record.get("parentEventID", "").strip()


def summarize_ala_archive(path: Path) -> dict:
    """Profile one ALA event archive without exposing record-level locations."""
    resource_id = path.stem
    if resource_id not in ALA_RESOURCES:
        raise ValueError(f"ALA resource is not in the licensed production allowlist: {resource_id}")

    total = 0
    root = 0
    child = 0
    root_valid_coordinates = 0
    root_au_coordinates = 0
    root_map_eligible_coordinates = 0
    root_years: list[int] = []
    root_year_counts: Counter[int] = Counter()
    root_taxon_ids: set[str] = set()
    event_ids: set[str] = set()

    for _, record in _dwca_core_rows(path):
        total += 1
        event_id = record.get("eventID", "")
        if event_id:
            if event_id in event_ids:
                raise ValueError(f"Duplicate eventID in {path.name}")
            event_ids.add(event_id)

        if not _is_root_accession(record):
            child += 1
            continue

        root += 1
        if _coordinate_pair(record) is not None:
            root_valid_coordinates += 1
            if record.get("countryCode", "").strip().upper() == "AU":
                root_au_coordinates += 1
                latitude, longitude = _coordinate_pair(record)
                if (
                    AU_LATITUDE_RANGE[0] <= latitude <= AU_LATITUDE_RANGE[1]
                    and AU_LONGITUDE_RANGE[0] <= longitude <= AU_LONGITUDE_RANGE[1]
                ):
                    root_map_eligible_coordinates += 1

        year = _year_from_record(record)
        if year is not None:
            root_years.append(year)
            root_year_counts[year] += 1

        taxon_id = record.get("taxonKey", "").strip()
        if taxon_id:
            root_taxon_ids.add(taxon_id)

    return {
        "resource_id": resource_id,
        "resource_name": ALA_RESOURCES[resource_id],
        "license": ALA_LICENSE,
        "license_url": ALA_LICENSE_URL,
        "source_url": ALA_RESOURCE_URL.format(resource_id=resource_id),
        "total_event_rows": total,
        "root_accessions": root,
        "child_event_rows": child,
        "root_valid_coordinate_pairs": root_valid_coordinates,
        "root_au_coordinate_pairs": root_au_coordinates,
        "root_map_eligible_coordinates": root_map_eligible_coordinates,
        "root_dated_records": len(root_years),
        "root_year_min": min(root_years) if root_years else None,
        "root_year_max": max(root_years) if root_years else None,
        "root_year_counts": dict(root_year_counts),
        "root_distinct_taxon_ids": len(root_taxon_ids),
    }


def summarize_ala_resources(directory: Path) -> dict:
    """Profile the ten CC BY resource snapshots and exclude dr21987."""
    resources = {}
    for resource_id in ALA_RESOURCES:
        path = directory / f"{resource_id}.zip"
        if not path.is_file():
            raise FileNotFoundError(f"Missing licensed ALA archive: {path}")
        resources[resource_id] = summarize_ala_archive(path)

    return {
        "resource_count": len(resources),
        "total_event_rows": sum(item["total_event_rows"] for item in resources.values()),
        "root_accessions": sum(item["root_accessions"] for item in resources.values()),
        "child_event_rows": sum(item["child_event_rows"] for item in resources.values()),
        "root_valid_coordinate_pairs": sum(
            item["root_valid_coordinate_pairs"] for item in resources.values()
        ),
        "root_au_coordinate_pairs": sum(
            item["root_au_coordinate_pairs"] for item in resources.values()
        ),
        "root_map_eligible_coordinates": sum(
            item["root_map_eligible_coordinates"] for item in resources.values()
        ),
        "root_dated_records": sum(item["root_dated_records"] for item in resources.values()),
        "resources": resources,
    }


def load_abs_population_march_2026(path: Path) -> dict[str, int]:
    """Read the March 2026 ERP column from ABS Table 3."""
    try:
        import openpyxl
    except ImportError as exc:  # pragma: no cover - environment setup failure
        raise RuntimeError("Install the pinned openpyxl dependency to read ABS XLSX inputs") from exc

    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    if "Table_3" not in workbook.sheetnames:
        raise ValueError(f"ABS workbook has no Table_3 sheet: {path}")

    populations: dict[str, int] = {}
    for row in workbook["Table_3"].iter_rows(values_only=True):
        name = row[0] if row else None
        value = row[4] if len(row) > 4 else None
        if isinstance(name, str) and isinstance(value, (int, float)):
            populations[name.strip()] = int(value)
    workbook.close()

    required = {
        "New South Wales",
        "Victoria",
        "Queensland",
        "South Australia",
        "Western Australia",
        "Tasmania",
        "Northern Territory",
        "Australian Capital Territory",
        "Total Other Territories",
    }
    missing = required - populations.keys()
    if missing:
        raise ValueError(f"ABS Table 3 is missing required population rows: {sorted(missing)}")
    return {
        **{name: populations[name] for name in sorted(required - {"Total Other Territories"})},
        "Other Territories": populations["Total Other Territories"],
    }


def load_ga_features(path: Path) -> list[dict]:
    """Load only verified GA facility fields needed for the story."""
    source = json.loads(path.read_text(encoding="utf-8"))
    features = []
    global_ids: set[str] = set()
    for feature in source.get("features", []):
        props = feature.get("properties") or {}
        global_id = str(props.get("globalid", "")).strip()
        if not global_id or global_id in global_ids:
            raise ValueError("GA facility records must have unique, non-empty globalid values")
        global_ids.add(global_id)

        latitude = float(props["latitude"])
        longitude = float(props["longitude"])
        area = float(props["area_hectares"])
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180 or area <= 0:
            raise ValueError(f"Invalid GA coordinates or area for {global_id}")

        features.append(
            {
                "globalid": global_id,
                "feature_name": props["feature_name"],
                "feature_subtype": props["feature_subtype"],
                "state": props["state"],
                "latitude": latitude,
                "longitude": longitude,
                "area_hectares": area,
                "locality": props.get("locality", ""),
                "postcode": props.get("postcode"),
            }
        )

    if len(features) != 182:
        raise ValueError(f"Expected 182 GA register features; found {len(features)}")
    return features


def summarize_gbif_archive(path: Path) -> dict:
    """Summarize a GBIF archive while keeping its record type explicit."""
    rows = 0
    basis = Counter()
    families = Counter()
    family_genus = Counter()
    ranks = Counter()
    year_counts = Counter()
    names_by_family: dict[str, set[str]] = {}
    years: list[int] = []
    family_decade_counts: Counter[tuple[str, int]] = Counter()

    for _, record in _dwca_core_rows(path):
        rows += 1
        if record.get("basisOfRecord"):
            basis[record["basisOfRecord"]] += 1

        family = record.get("family", "").strip()
        if family:
            families[family] += 1
            genus = record.get("genus", "").strip() or "Genus not recorded"
            family_genus[(family, genus)] += 1
            names_by_family.setdefault(family, set())
            accepted = record.get("acceptedNameUsage", "").strip()
            scientific = record.get("scientificName", "").strip()
            taxon_name = accepted or scientific
            if taxon_name:
                names_by_family[family].add(taxon_name)

        rank = record.get("taxonRank", "").strip()
        if rank:
            ranks[rank] += 1

        year = _year_from_record(record)
        if year is not None:
            years.append(year)
            year_counts[year] += 1
            if family:
                family_decade_counts[(family, (year // 10) * 10)] += 1

    return {
        "record_count": rows,
        "basis_of_record": dict(basis),
        "family_record_counts": dict(families),
        "family_genus_counts": dict(family_genus),
        "family_count": len(families),
        "family_nonblank_records": sum(families.values()),
        "family_distinct_name_counts": {
            family: len(names) for family, names in names_by_family.items()
        },
        "rank_counts": dict(ranks),
        "year_count": len(years),
        "year_min": min(years) if years else None,
        "year_max": max(years) if years else None,
        "year_counts": dict(year_counts),
        "family_decade_counts": dict(family_decade_counts),
    }


def _signed_ring_area(ring: list[list[float]]) -> float:
    return sum(
        ring[index][0] * ring[index + 1][1]
        - ring[index + 1][0] * ring[index][1]
        for index in range(len(ring) - 1)
    ) / 2


def _normalize_geometry_winding(geometry: dict) -> dict:
    """Orient polygon rings for D3/Vega's spherical GeoJSON path convention."""
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates") or []
    polygons = [coordinates] if geometry_type == "Polygon" else coordinates
    normalized_polygons = []
    for polygon in polygons:
        if not polygon:
            continue
        valid_rings = []
        for ring in polygon:
            area = _signed_ring_area(ring)
            if abs(area) <= 1e-12:
                continue
            valid_rings.append((area, ring))

        # The ABS service can place collapsed or smaller rings ahead of the
        # enclosing shell. Put the largest valid ring first before assigning
        # D3's exterior/interior winding convention.
        valid_rings.sort(key=lambda item: abs(item[0]), reverse=True)
        rings = []
        for index, (area, ring) in enumerate(valid_rings):
            # D3's spherical convention is opposite RFC 7946 for sub-hemisphere
            # polygons: exterior rings clockwise, holes counterclockwise.
            should_be_negative = index == 0
            if (should_be_negative and area > 0) or (not should_be_negative and area < 0):
                ring = list(reversed(ring))
            rings.append(ring)
        if rings:
            normalized_polygons.append(rings)

    normalized = {**geometry, "coordinates": normalized_polygons if geometry_type == "MultiPolygon" else (normalized_polygons[0] if normalized_polygons else [])}
    return normalized


def load_asgs_boundaries(path: Path) -> list[dict]:
    """Load the nine 2026 state/territory geometries and omit null code Z."""
    source = json.loads(path.read_text(encoding="utf-8"))
    expected_codes = {str(code) for code in range(1, 10)}
    boundaries = []
    for feature in source.get("features", []):
        if feature.get("geometry") is None:
            continue
        code = str((feature.get("properties") or {}).get("STATE_CODE_2026", ""))
        if code not in expected_codes:
            continue
        boundaries.append(
            {
                **feature,
                "geometry": _normalize_geometry_winding(feature["geometry"]),
            }
        )
    codes = {
        str(feature["properties"]["STATE_CODE_2026"]) for feature in boundaries
    }
    if codes != expected_codes:
        raise ValueError(f"ASGS Edition 4 must contain codes 1-9; found {sorted(codes)}")
    return boundaries


STATE_CODE_BY_GA = {
    "NSW": "1",
    "VIC": "2",
    "QLD": "3",
    "SA": "4",
    "WA": "5",
    "TAS": "6",
    "NT": "7",
    "ACT": "8",
    "OT": "9",
}

STATE_ABBREVIATIONS = {
    "1": "NSW",
    "2": "VIC",
    "3": "QLD",
    "4": "SA",
    "5": "WA",
    "6": "TAS",
    "7": "NT",
    "8": "ACT",
    "9": "OT",
}


def _geometry_label_anchor(geometry: dict) -> tuple[float, float]:
    """Choose a deterministic label anchor from the largest outer polygon ring."""
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates") or []
    polygons = [coordinates] if geometry_type == "Polygon" else coordinates
    rings = [polygon[0] for polygon in polygons if polygon]
    if not rings:
        raise ValueError("ASGS polygon has no outer ring for label placement")

    def extent(ring: list[list[float]]) -> tuple[float, float, float, float]:
        longitudes = [point[0] for point in ring]
        latitudes = [point[1] for point in ring]
        return min(longitudes), max(longitudes), min(latitudes), max(latitudes)

    west, east, south, north = max(
        (extent(ring) for ring in rings),
        key=lambda bounds: (bounds[1] - bounds[0]) * (bounds[3] - bounds[2]),
    )
    return (west + east) / 2, (south + north) / 2


def build_state_metrics(
    facilities: list[dict], population: dict[str, int], boundaries: list[dict]
) -> dict:
    """Join known-register counts to ERP while separating Other Territories."""
    state_names = {
        "1": "New South Wales",
        "2": "Victoria",
        "3": "Queensland",
        "4": "South Australia",
        "5": "Western Australia",
        "6": "Tasmania",
        "7": "Northern Territory",
        "8": "Australian Capital Territory",
        "9": "Other Territories",
    }
    counts = Counter(STATE_CODE_BY_GA.get(row["state"]) for row in facilities)
    unknown = [row["state"] for row in facilities if row["state"] not in STATE_CODE_BY_GA]
    if unknown:
        raise ValueError(f"Unknown GA state codes: {sorted(set(unknown))}")
    if sum(counts[str(code)] for code in range(1, 9)) != 181 or counts["9"] != 1:
        raise ValueError("GA jurisdiction counts do not reconcile to 181 standard + 1 Other Territories")

    output = []
    seen_codes = set()
    for boundary in boundaries:
        properties = boundary["properties"]
        code = str(properties["STATE_CODE_2026"])
        name = state_names[code]
        if properties.get("STATE_NAME_2026") != name:
            raise ValueError(f"ASGS code/name mismatch: {code} {properties.get('STATE_NAME_2026')}")
        if name not in population:
            raise ValueError(f"Missing ABS ERP for {name}")
        erp = population[name]
        facility_count = counts[code]
        eligible = code != "9"
        label_longitude, label_latitude = _geometry_label_anchor(boundary["geometry"])
        output.append(
            {
                "type": "Feature",
                "geometry": boundary["geometry"],
                "properties": {
                    "state_code": code,
                    "state": name,
                    "state_abbreviation": STATE_ABBREVIATIONS[code],
                    "label_longitude": label_longitude,
                    "label_latitude": label_latitude,
                    "facility_count": facility_count,
                    "population": erp,
                    "facilities_per_million": (
                        facility_count / erp * 1_000_000 if eligible else None
                    ),
                    "comparison_eligible": eligible,
                },
            }
        )
        seen_codes.add(code)

    if seen_codes != {str(code) for code in range(1, 10)}:
        raise ValueError("State metrics are missing an ASGS jurisdiction")
    return {"type": "FeatureCollection", "features": output}


def _descending_midranks(rows: list[dict], field: str) -> dict[str, float]:
    ordered = sorted(rows, key=lambda row: (-row[field], row["state"]))
    ranks = {}
    start = 0
    while start < len(ordered):
        end = start + 1
        while end < len(ordered) and ordered[end][field] == ordered[start][field]:
            end += 1
        midrank = ((start + 1) + end) / 2
        for row in ordered[start:end]:
            ranks[row["state"]] = midrank
        start = end
    return ranks


def build_state_rank_data(state_metrics: dict) -> list[dict]:
    """Compare raw-count and per-million ranks for the eight standard jurisdictions."""
    rows = [
        feature["properties"]
        for feature in state_metrics["features"]
        if feature["properties"]["comparison_eligible"]
    ]
    count_ranks = _descending_midranks(rows, "facility_count")
    rate_ranks = _descending_midranks(rows, "facilities_per_million")
    output = []
    for row in rows:
        output.append(
            {
                **row,
                "facility_count_rank": count_ranks[row["state"]],
                "facility_rate_rank": rate_ranks[row["state"]],
                "rank_change_after_rate": count_ranks[row["state"]]
                - rate_ranks[row["state"]],
            }
        )
    return sorted(output, key=lambda row: (row["facility_count_rank"], row["state"]))


ALBERS_RADIUS_M = 6_371_007.1809
ALBERS_LON0 = math.radians(132.0)
ALBERS_LAT0 = math.radians(-25.0)
ALBERS_PHI1 = math.radians(-18.0)
ALBERS_PHI2 = math.radians(-36.0)
ALBERS_N = (math.sin(ALBERS_PHI1) + math.sin(ALBERS_PHI2)) / 2
ALBERS_C = 1 + math.sin(ALBERS_PHI1) * ALBERS_N
ALBERS_RHO0 = (
    math.sqrt(ALBERS_C - 2 * ALBERS_N * math.sin(ALBERS_LAT0)) / ALBERS_N
)


def albers_forward(longitude: float, latitude: float) -> tuple[float, float]:
    """Spherical Australian Albers equal-area projection in metres."""
    lam = math.radians(longitude)
    phi = math.radians(latitude)
    radicand = ALBERS_C - 2 * ALBERS_N * math.sin(phi)
    if radicand < 0:
        raise ValueError("Coordinate is outside the Albers projection domain")
    rho = math.sqrt(radicand) / ALBERS_N
    theta = ALBERS_N * (lam - ALBERS_LON0)
    x = ALBERS_RADIUS_M * rho * math.sin(theta)
    y = ALBERS_RADIUS_M * (ALBERS_RHO0 - rho * math.cos(theta))
    return x, y


def albers_inverse(x: float, y: float) -> tuple[float, float]:
    """Inverse of the spherical Australian Albers equal-area projection."""
    x_scaled = x / ALBERS_RADIUS_M
    dy_scaled = ALBERS_RHO0 - y / ALBERS_RADIUS_M
    rho = math.copysign(math.hypot(x_scaled, dy_scaled), ALBERS_N)
    theta = math.atan2(x_scaled / rho, dy_scaled / rho)
    longitude = math.degrees(ALBERS_LON0 + theta / ALBERS_N)
    latitude_argument = (ALBERS_C - (rho * ALBERS_N) ** 2) / (2 * ALBERS_N)
    latitude_argument = max(-1.0, min(1.0, latitude_argument))
    latitude = math.degrees(math.asin(latitude_argument))
    return longitude, latitude


def _cube_round_hex(x: float, y: float, radius: float) -> tuple[int, int]:
    """Return axial coordinates for the nearest flat-top hexagon."""
    q = (2.0 / 3.0 * x) / radius
    r = (-x / 3.0 + math.sqrt(3.0) / 3.0 * y) / radius
    cube_x, cube_z = q, r
    cube_y = -cube_x - cube_z
    rounded_x, rounded_y, rounded_z = round(cube_x), round(cube_y), round(cube_z)
    x_diff = abs(rounded_x - cube_x)
    y_diff = abs(rounded_y - cube_y)
    z_diff = abs(rounded_z - cube_z)
    if x_diff > y_diff and x_diff > z_diff:
        rounded_x = -rounded_y - rounded_z
    elif y_diff > z_diff:
        rounded_y = -rounded_x - rounded_z
    else:
        rounded_z = -rounded_x - rounded_y
    return int(rounded_x), int(rounded_z)


def _hex_center(q: int, r: int, radius: float) -> tuple[float, float]:
    return (
        radius * 1.5 * q,
        radius * math.sqrt(3.0) * (r + q / 2.0),
    )


def _hex_polygon(q: int, r: int, radius: float) -> list[list[float]]:
    center_x, center_y = _hex_center(q, r, radius)
    ring = []
    for step in range(6):
        angle = math.radians(60 * step)
        longitude, latitude = albers_inverse(
            center_x + radius * math.cos(angle),
            center_y + radius * math.sin(angle),
        )
        ring.append([round(longitude, 5), round(latitude, 5)])
    ring.append(ring[0])
    return ring


def build_ala_origin_hexes(
    directory: Path,
    boundaries: list[dict],
    cell_width_km: float = 100,
    minimum_records: int = 5,
) -> tuple[dict, dict]:
    """Aggregate Australian top-level accessions to privacy-conscious hexes."""
    if cell_width_km <= 0 or minimum_records < 1:
        raise ValueError("Hex width and suppression threshold must be positive")
    # A broad territorial envelope from ASGS Edition 4 retains Norfolk and Cocos.
    west, east = AU_LONGITUDE_RANGE
    south, north = AU_LATITUDE_RANGE
    radius_m = cell_width_km * 500.0
    cells: Counter[tuple[int, int]] = Counter()
    resources = summarize_ala_resources(directory)
    eligible = 0
    for resource_id in ALA_RESOURCES:
        path = directory / f"{resource_id}.zip"
        for _, record in _dwca_core_rows(path):
            if not _is_root_accession(record):
                continue
            if record.get("countryCode", "").strip().upper() != "AU":
                continue
            pair = _coordinate_pair(record)
            if pair is None:
                continue
            latitude, longitude = pair
            if not south <= latitude <= north or not west <= longitude <= east:
                continue
            x, y = albers_forward(longitude, latitude)
            cells[_cube_round_hex(x, y, radius_m)] += 1
            eligible += 1

    kept = {key: count for key, count in cells.items() if count >= minimum_records}
    suppressed = {key: count for key, count in cells.items() if count < minimum_records}
    features = []
    for (q, r), count in sorted(kept.items()):
        features.append(
            {
                "type": "Feature",
                "geometry": _normalize_geometry_winding(
                    {"type": "Polygon", "coordinates": [_hex_polygon(q, r, radius_m)]}
                ),
                "properties": {"record_count": count},
            }
        )

    output = {"type": "FeatureCollection", "features": features}
    profile = {
        "resource_count": len(ALA_RESOURCES),
        "root_accessions": resources["root_accessions"],
        "eligible_coordinate_records": eligible,
        "eligible_coordinate_share": eligible / resources["root_accessions"] * 100,
        "published_hex_count": len(kept),
        "published_record_count": sum(kept.values()),
        "suppressed_hex_count": len(suppressed),
        "suppressed_records": sum(suppressed.values()),
        "cell_width_km": cell_width_km,
        "minimum_records_per_cell": minimum_records,
    }
    if profile["published_record_count"] + profile["suppressed_records"] != eligible:
        raise AssertionError("Hex-bin counts do not reconcile to eligible coordinates")
    return output, profile


def build_treemap_layout(
    family_counts: dict[str, int], width: float, height: float, top_n: int = 12,
    other_label: str = "Other families",
) -> list[dict]:
    """Create deterministic binary-treemap rectangles with area proportional to counts."""
    if width <= 0 or height <= 0 or top_n < 1:
        raise ValueError("Treemap dimensions and top_n must be positive")
    values = sorted(
        ((family, int(count)) for family, count in family_counts.items() if int(count) > 0),
        key=lambda item: (-item[1], item[0]),
    )
    if not values:
        raise ValueError("Treemap needs at least one positive family count")
    visible = values[:top_n]
    remainder = sum(count for _, count in values[top_n:])
    if remainder:
        visible.append((other_label, remainder))
    total = sum(count for _, count in visible)
    rectangles: list[dict] = []

    def split(items: list[tuple[str, int]], x0: float, y0: float, x1: float, y1: float) -> None:
        if len(items) == 1:
            family, count = items[0]
            rectangles.append(
                {
                    "family": family,
                    "record_count": count,
                    "area_share": count / total,
                    "x0": x0,
                    "y0": y0,
                    "x1": x1,
                    "y1": y1,
                }
            )
            return

        group_total = sum(count for _, count in items)
        cumulative = 0
        candidates = []
        for index in range(1, len(items)):
            cumulative += items[index - 1][1]
            candidates.append((abs(group_total / 2 - cumulative), index, cumulative))
        _, split_index, first_total = min(candidates)
        fraction = first_total / group_total
        if (x1 - x0) >= (y1 - y0):
            cut = x0 + (x1 - x0) * fraction
            split(items[:split_index], x0, y0, cut, y1)
            split(items[split_index:], cut, y0, x1, y1)
        else:
            cut = y0 + (y1 - y0) * fraction
            split(items[:split_index], x0, y0, x1, cut)
            split(items[split_index:], x0, cut, x1, y1)

    split(visible, 0.0, 0.0, float(width), float(height))
    return rectangles


def build_family_genus_treemap(profile: dict, width: float, height: float) -> list[dict]:
    """Nest real genus counts inside family rectangles, preserving parent areas."""
    family_counts = profile["family_record_counts"]
    parent_rects = build_treemap_layout(family_counts, width, height, top_n=5)
    known = profile["family_genus_counts"]
    total = sum(family_counts.values())
    rows = []
    for parent in parent_rects:
        family = parent["family"]
        family_count = parent["record_count"]
        parent_row = {
            **parent,
            "level": "family",
            "genus": "",
            "colour_group": family,
            "family_total": family_count,
            "share": family_count / total,
            "label_x": (parent["x0"] + parent["x1"]) / 2,
            "label_y": (parent["y0"] + parent["y1"]) / 2,
        }
        rows.append(parent_row)
        if family == "Other families":
            genus_counts = {"Remaining families": family_count}
        else:
            genus_counts = {
                genus: count for (parent_family, genus), count in known.items()
                if parent_family == family
            }
            if sum(genus_counts.values()) != family_count:
                raise AssertionError(f"Family/genus reconciliation failed for {family}")
        nested = build_treemap_layout(
            genus_counts,
            parent["x1"] - parent["x0"],
            parent["y1"] - parent["y0"],
            top_n=4,
            other_label="Other genera",
        )
        for child in nested:
            rows.append({
                "level": "genus",
                "family": family,
                "genus": child["family"],
                "colour_group": parent_row["colour_group"],
                "record_count": child["record_count"],
                "family_total": family_count,
                "share": child["record_count"] / total,
                "area_share": child["record_count"] / total,
                "x0": parent["x0"] + child["x0"],
                "x1": parent["x0"] + child["x1"],
                "y0": parent["y0"] + child["y0"],
                "y1": parent["y0"] + child["y1"],
                "label_x": parent["x0"] + (child["x0"] + child["x1"]) / 2,
                "label_y": parent["y0"] + (child["y0"] + child["y1"]) / 2,
            })
    assert sum(r["record_count"] for r in rows if r["level"] == "genus") == total
    return rows


def _write_json(path: Path, value: object) -> None:
    # Keep public data payloads small; chart specifications remain separately readable.
    path.write_text(
        json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def _write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def _quantile(values: list[float], probability: float) -> float:
    ordered = sorted(values)
    if not ordered:
        raise ValueError("Cannot calculate a quantile from an empty list")
    position = (len(ordered) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def _area_summary(facilities: list[dict]) -> dict:
    grouped: dict[str, list[float]] = {"Botanic Garden": [], "Arboretum": []}
    for facility in facilities:
        grouped[facility["feature_subtype"]].append(facility["area_hectares"])
    output = {}
    for subtype, values in grouped.items():
        q1 = _quantile(values, 0.25)
        median = _quantile(values, 0.5)
        q3 = _quantile(values, 0.75)
        iqr = q3 - q1
        lower_fence = q1 - 1.5 * iqr
        upper_fence = q3 + 1.5 * iqr
        inliers = [value for value in values if lower_fence <= value <= upper_fence]
        output[subtype] = {
            "count": len(values),
            "minimum": min(values),
            "q1": q1,
            "median": median,
            "q3": q3,
            "maximum": max(values),
            "lower_whisker": min(inliers),
            "upper_whisker": max(inliers),
            "outlier_count": sum(value < lower_fence or value > upper_fence for value in values),
        }
    return output


def _group_by_decade(year_counts: dict[int, int]) -> list[dict]:
    decades = Counter()
    for year, count in year_counts.items():
        decades[(int(year) // 10) * 10] += int(count)
    return [
        {"decade": decade, "decade_end": decade + 10, "decade_label": f"{decade}s", "record_count": decades[decade]}
        for decade in sorted(decades)
    ]


def _top_family_rows(profile: dict, limit: int = 12) -> list[dict]:
    counts = profile["family_record_counts"]
    ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    displayed = ordered[:limit]
    remainder = sum(count for _, count in ordered[limit:])
    rows = [{"family": family, "record_count": count} for family, count in displayed]
    if remainder:
        rows.append({"family": "Other families", "record_count": remainder})
    denominator = sum(row["record_count"] for row in rows)
    for row in rows:
        row["share"] = row["record_count"] / denominator
    return rows


def build_family_decade_matrix(profile: dict, top_n: int = 10) -> list[dict]:
    """Summarize top PlantBank families by decade, pooling the remaining families."""
    if top_n < 1:
        raise ValueError("top_n must be positive")
    family_totals = profile["family_record_counts"]
    top_families = [
        family
        for family, _ in sorted(family_totals.items(), key=lambda item: (-item[1], item[0]))[:top_n]
    ]
    top_set = set(top_families)
    decades = sorted({int(decade) for _, decade in profile["family_decade_counts"]})
    output = []
    ordered_families = [*top_families, "Other families"]
    for family_order, family in enumerate(ordered_families):
        for decade in decades:
            output.append(
                {
                    "family": family,
                    "family_order": family_order,
                    "decade": decade,
                    "decade_label": f"{decade}s",
                    "record_count": profile["family_decade_counts"].get((family, decade), 0),
                }
            )
    for row in output:
        if row["family"] == "Other families":
            row["record_count"] = sum(
                count
                for (family, record_decade), count in profile["family_decade_counts"].items()
                if record_decade == row["decade"] and family not in top_set
            )
    return output


def prepare_public_data(raw_root: Path, output_dir: Path) -> dict:
    """Regenerate all lightweight public chart data from local source snapshots."""
    raw_root = Path(raw_root)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    ga_path = raw_root / "ga" / "botanical_gardens_2026-10-14.geojson"
    abs_population_path = raw_root / "abs" / "31010do001_202603.xlsx"
    abs_boundary_path = raw_root / "abs" / "asgs4_states_2026_0p005.geojson"
    ala_dir = raw_root / "ala"
    plantbank_path = raw_root / "gbif" / "plantbank_dr726.zip"
    kingspark_path = raw_root / "gbif" / "kingspark_dr22285.zip"

    facilities = load_ga_features(ga_path)
    populations = load_abs_population_march_2026(abs_population_path)
    boundaries = load_asgs_boundaries(abs_boundary_path)
    state_geojson = build_state_metrics(facilities, populations, boundaries)
    state_ranks = build_state_rank_data(state_geojson)
    ala = summarize_ala_resources(ala_dir)
    origin_hexes, origin_profile = build_ala_origin_hexes(ala_dir, boundaries)
    plantbank = summarize_gbif_archive(plantbank_path)
    kingspark = summarize_gbif_archive(kingspark_path)
    area_stats = _area_summary(facilities)

    # GA point coordinates are a licensed, mapped source. The ALA origin file below
    # contains only generalized hexagon polygons and aggregate counts.
    facility_features = [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [facility["longitude"], facility["latitude"]],
            },
            "properties": {
                "globalid": facility["globalid"],
                "feature_name": facility["feature_name"],
                "feature_subtype": facility["feature_subtype"],
                "state": facility["state"],
                "locality": facility["locality"],
                "postcode": facility["postcode"],
                "latitude": facility["latitude"],
                "longitude": facility["longitude"],
                "area_hectares": facility["area_hectares"],
            },
        }
        for facility in facilities
    ]
    _write_json(
        output_dir / "facility_points.geojson",
        {"type": "FeatureCollection", "features": facility_features},
    )
    _write_json(output_dir / "state_rates.geojson", state_geojson)
    _write_json(output_dir / "ala_origin_hexes.geojson", origin_hexes)
    _write_json(output_dir / "facility_area_stats.json", area_stats)

    state_rows = []
    type_counts = Counter(
        (STATE_CODE_BY_GA[facility["state"]], facility["feature_subtype"])
        for facility in facilities
    )
    for feature in state_geojson["features"]:
        properties = feature["properties"]
        state_rows.append(properties)
    _write_csv(
        output_dir / "state_summary.csv",
        [
            "state_code",
            "state",
            "facility_count",
            "population",
            "facilities_per_million",
            "comparison_eligible",
        ],
        state_rows,
    )

    matrix_rows = []
    for feature in state_geojson["features"]:
        properties = feature["properties"]
        code = properties["state_code"]
        for subtype in ("Botanic Garden", "Arboretum"):
            matrix_rows.append(
                {
                    "state_code": code,
                    "state": properties["state"],
                    "feature_subtype": subtype,
                    "facility_count": type_counts[(code, subtype)],
                }
            )
    _write_csv(
        output_dir / "facility_by_state_type.csv",
        ["state_code", "state", "feature_subtype", "facility_count"],
        matrix_rows,
    )
    _write_csv(
        output_dir / "state_rank_comparison.csv",
        [
            "state_code",
            "state",
            "facility_count",
            "population",
            "facilities_per_million",
            "facility_count_rank",
            "facility_rate_rank",
            "rank_change_after_rate",
        ],
        state_ranks,
    )
    _write_csv(
        output_dir / "facility_areas.csv",
        ["globalid", "feature_name", "feature_subtype", "state", "locality", "area_hectares"],
        facilities,
    )

    resource_rows = []
    for resource_id, item in ala["resources"].items():
        coordinate_share = (
            item["root_map_eligible_coordinates"] / item["root_accessions"] * 100
            if item["root_accessions"]
            else 0
        )
        date_share = (
            item["root_dated_records"] / item["root_accessions"] * 100
            if item["root_accessions"]
            else 0
        )
        resource_rows.append(
            {
                "resource_id": resource_id,
                "resource_name": item["resource_name"],
                "resource_short": ALA_RESOURCE_SHORT[resource_id],
                "root_accessions": item["root_accessions"],
                "child_event_rows_excluded": item["child_event_rows"],
                "distinct_taxon_ids": item["root_distinct_taxon_ids"],
                "map_eligible_coordinates": item["root_map_eligible_coordinates"],
                "map_coordinate_share_pct": coordinate_share,
                "dated_accessions": item["root_dated_records"],
                "date_share_pct": date_share,
                "earliest_recorded_year": item["root_year_min"],
                "latest_recorded_year": item["root_year_max"],
                "license": item["license"],
                "source_url": item["source_url"],
            }
        )
    resource_rows.sort(key=lambda row: (-row["root_accessions"], row["resource_name"]))
    for resource_order, row in enumerate(resource_rows):
        row["resource_order"] = resource_order
    _write_csv(
        output_dir / "ala_resource_profile.csv",
        [
            "resource_id",
            "resource_name",
            "resource_short",
            "resource_order",
            "root_accessions",
            "child_event_rows_excluded",
            "distinct_taxon_ids",
            "map_eligible_coordinates",
            "map_coordinate_share_pct",
            "dated_accessions",
            "date_share_pct",
            "earliest_recorded_year",
            "latest_recorded_year",
            "license",
            "source_url",
        ],
        resource_rows,
    )
    coordinate_rows = sorted(
        resource_rows,
        key=lambda row: (-row["map_coordinate_share_pct"], row["resource_name"]),
    )
    coordinate_rows = [
        {**row, "coordinate_order": order} for order, row in enumerate(coordinate_rows)
    ]
    _write_csv(
        output_dir / "ala_coordinate_coverage.csv",
        ["resource_id", "resource_name", "resource_short", "coordinate_order", "root_accessions", "map_eligible_coordinates", "map_coordinate_share_pct"],
        coordinate_rows,
    )
    _write_csv(
        output_dir / "ala_date_coverage.csv",
        ["resource_id", "resource_name", "resource_short", "root_accessions", "dated_accessions", "date_share_pct", "earliest_recorded_year", "latest_recorded_year"],
        resource_rows,
    )

    ala_years = Counter()
    for item in ala["resources"].values():
        for year, count in item["root_year_counts"].items():
            ala_years[int(year)] += int(count)
    ala_decades = _group_by_decade(dict(ala_years))
    _write_csv(
        output_dir / "ala_year_histogram.csv",
        ["decade", "decade_end", "decade_label", "record_count"],
        ala_decades,
    )

    plantbank_decades = _group_by_decade(plantbank["year_counts"])
    _write_csv(
        output_dir / "plantbank_year_histogram.csv",
        ["decade", "decade_end", "decade_label", "record_count"],
        plantbank_decades,
    )
    plantbank_family_decades = build_family_decade_matrix(plantbank, top_n=10)
    _write_csv(
        output_dir / "plantbank_family_decades.csv",
        ["family", "family_order", "decade", "decade_label", "record_count"],
        plantbank_family_decades,
    )
    plantbank_families = _top_family_rows(plantbank, limit=12)
    plantbank_layout = build_family_genus_treemap(plantbank, width=1000, height=600)
    _write_csv(
        output_dir / "plantbank_family_treemap.csv",
        ["level", "family", "genus", "colour_group", "record_count", "family_total", "share", "area_share",
         "x0", "y0", "x1", "y1", "label_x", "label_y"],
        plantbank_layout,
    )

    kingspark_families = _top_family_rows(kingspark, limit=12)
    kingspark_family_rows = [
        {"family_order": order, **row}
        for order, row in enumerate(kingspark_families)
    ]
    _write_csv(
        output_dir / "kingspark_family_records.csv",
        ["family_order", "family", "record_count", "share"],
        kingspark_family_rows,
    )

    largest = max(facilities, key=lambda row: row["area_hectares"])
    rate_rows = [
        feature["properties"]
        for feature in state_geojson["features"]
        if feature["properties"]["comparison_eligible"]
    ]
    rate_rows.sort(key=lambda row: (-row["facilities_per_million"], row["state"]))
    facts = {
        "snapshot_date": "2026-10-14",
        "ga": {
            "facility_count": len(facilities),
            "botanic_gardens": sum(row["feature_subtype"] == "Botanic Garden" for row in facilities),
            "arboreta": sum(row["feature_subtype"] == "Arboretum" for row in facilities),
            "largest_registered_footprint": {
                "name": largest["feature_name"],
                "hectares": largest["area_hectares"],
                "subtype": largest["feature_subtype"],
                "state": largest["state"],
            },
            "area_stats": area_stats,
        },
        "abs": {
            "reference_date": "2026-03-31",
            "comparison_jurisdictions": 8,
            "other_territories_facility_count": 1,
            "other_territories_population": populations["Other Territories"],
            "other_territories_facility_per_million_not_plotted": (
                1 / populations["Other Territories"] * 1_000_000
            ),
            "highest_rate_state": rate_rows[0]["state"],
            "highest_rate": rate_rows[0]["facilities_per_million"],
            "lowest_rate_state": rate_rows[-1]["state"],
            "lowest_rate": rate_rows[-1]["facilities_per_million"],
        },
        "ala": {
            "resource_count": ala["resource_count"],
            "total_event_rows": ala["total_event_rows"],
            "root_accessions": ala["root_accessions"],
            "child_event_rows_excluded": ala["child_event_rows"],
            "root_map_eligible_coordinates": origin_profile["eligible_coordinate_records"],
            "published_hex_records": origin_profile["published_record_count"],
            "suppressed_hex_records": origin_profile["suppressed_records"],
            "root_dated_accessions": ala["root_dated_records"],
            "year_min": min(ala_years) if ala_years else None,
            "year_max": max(ala_years) if ala_years else None,
            "origin_bin_width_km": origin_profile["cell_width_km"],
            "origin_cell_suppression_threshold": origin_profile["minimum_records_per_cell"],
        },
        "plantbank": {
            "record_count": plantbank["record_count"],
            "basis_of_record": "LIVING_SPECIMEN",
            "family_records": plantbank["family_nonblank_records"],
            "family_count": plantbank["family_count"],
            "recorded_years": plantbank["year_count"],
            "year_min": plantbank["year_min"],
            "year_max": plantbank["year_max"],
            "top_family": plantbank_families[0],
        },
        "kingspark": {
            "record_count": kingspark["record_count"],
            "basis_of_record": "PRESERVED_SPECIMEN",
            "family_records": kingspark["family_nonblank_records"],
            "family_count": kingspark["family_count"],
            "date_fields_with_usable_year": kingspark["year_count"],
            "top_family": kingspark_families[0],
        },
    }
    _write_json(output_dir / "data_quality.json", facts)

    snapshots_path = raw_root / "source_snapshots.json"
    snapshots = json.loads(snapshots_path.read_text(encoding="utf-8"))
    input_snapshots = {entry["path"]: entry for entry in snapshots.get("sources", [])}
    missing_snapshots = set(PRODUCTION_SOURCE_PATHS) - input_snapshots.keys()
    if missing_snapshots:
        raise ValueError(f"Production input hashes are missing: {sorted(missing_snapshots)}")
    public_provenance = {
        "snapshot_date": snapshots.get("snapshot_date"),
        "sources": [input_snapshots[path] for path in PRODUCTION_SOURCE_PATHS],
    }
    _write_json(output_dir / "source_provenance.json", public_provenance)

    payload_bytes = sum(path.stat().st_size for path in output_dir.iterdir() if path.is_file())
    profile = {
        "ga_features": len(facilities),
        "ala_root_accessions": ala["root_accessions"],
        "ala_map_eligible_coordinates": origin_profile["eligible_coordinate_records"],
        "plantbank_basis_of_record": "LIVING_SPECIMEN",
        "kingspark_basis_of_record": "PRESERVED_SPECIMEN",
        "payload_bytes": payload_bytes,
    }
    return profile


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare DV2 public chart data from source snapshots.")
    parser.add_argument("--raw-root", type=Path, default=Path(__file__).resolve().parents[2] / "data" / "raw")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parents[1] / "public" / "data")
    args = parser.parse_args()
    print(json.dumps(prepare_public_data(args.raw_root, args.output_dir), indent=2))


if __name__ == "__main__":
    main()

