"""
Google Earth Engine — Sentinel-1 SAR Flood Detection + Tile Serving

Matches validated GEE script:
  https://code.earthengine.google.com/5a3f8f2a29480a3e2ffe2ff3bd4cc789

Pipeline
--------
1. Load Sentinel-1 GRD IW **DESCENDING**, VH polarisation.
2. Median composites for BEFORE and AFTER windows.
3. Remove extreme noise (< −30 dB).
4. Focal-mean smoothing (30 m circle).
5. Ratio  (after / before)  →  threshold > 1.4  →  flood mask.
6. JRC permanent water mask  (occurrence > 90).
7. Connected-pixel noise removal  (min 20 of 100).
8. Slope filter < 3°  (HydroSHEDS 03VFDEM).
9. Tile URL generation via getMapId() for Mapbox rendering.
"""

import logging
import os
from typing import Any

logger = logging.getLogger("geonix.gee")

# ---------------------------------------------------------------------------
# Lazy import — GEE is optional (mock when credentials missing)
# ---------------------------------------------------------------------------
try:
    import ee  # type: ignore
    _GEE_AVAILABLE = True
except ImportError:
    _GEE_AVAILABLE = False
    logger.warning("earthengine-api not installed — mock mode only.")


# ---------------------------------------------------------------------------
# Constants  (matching the validated GEE script exactly)
# ---------------------------------------------------------------------------

_S1_COLLECTION = "COPERNICUS/S1_GRD"
_JRC_WATER     = "JRC/GSW1_4/GlobalSurfaceWater"
_HYDRO_DEM     = "WWF/HydroSHEDS/03VFDEM"
_COUNTRIES     = "USDOS/LSIB_SIMPLE/2017"

# Validated thresholds
_NOISE_FLOOR_DB     = -30     # Mask out extreme noise below this
_SMOOTHING_RADIUS_M = 30      # Focal-mean radius in meters
_RATIO_THRESHOLD    = 1.4     # flood = (after / before) > this
_WATER_OCCURRENCE   = 90      # JRC permanent-water threshold
_CONNECTED_MAX      = 100     # Connected-pixel window size
_CONNECTED_MIN      = 20      # Minimum cluster to keep
_MAX_SLOPE_DEG      = 3       # Maximum slope considered floodable

# Default date windows  (Kazakhstan flooding event)
DEFAULT_DATES = {
    "before_start": "2024-09-01",
    "before_end":   "2025-09-10",
    "after_start":  "2024-10-15",
    "after_end":    "2025-10-25",
}

# Preset AOIs
PRESET_AOIS = {
    "Kazakhstan":  {"country_name": "Kazakhstan",  "center": [48.0, 67.0],  "zoom": 5},
    "Vietnam":     {"country_name": "Vietnam",     "center": [16.0, 108.0], "zoom": 6},
    "Bangladesh":  {"country_name": "Bangladesh",  "center": [23.7, 90.4],  "zoom": 7},
    "Pakistan":    {"country_name": "Pakistan",    "center": [30.0, 70.0],  "zoom": 6},
    "Myanmar":     {"country_name": "Myanmar",     "center": [19.8, 96.2],  "zoom": 6},
    "India":       {"country_name": "India",       "center": [22.0, 78.0],  "zoom": 5},
}


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

_gee_initialised = False


def init_earth_engine() -> None:
    """
    Authenticate with GEE using the user's project.

    Priority:
      1. Service-account JSON key  (GEE_KEY_FILE + GEE_SERVICE_ACCOUNT)
      2. User credentials from `earthengine authenticate`
    """
    global _gee_initialised
    if not _GEE_AVAILABLE:
        raise RuntimeError("earthengine-api package not installed.")

    project = os.getenv("GEE_PROJECT", "solar-modem-468207-q0")
    key_file = os.getenv("GEE_KEY_FILE")
    service_account = os.getenv("GEE_SERVICE_ACCOUNT")

    if key_file and service_account and os.path.isfile(key_file):
        credentials = ee.ServiceAccountCredentials(service_account, key_file)
        ee.Initialize(credentials, project=project)
        logger.info("GEE initialised via service-account (project=%s).", project)
    else:
        # Use credentials from `earthengine authenticate`
        ee.Initialize(project=project)
        logger.info("GEE initialised via user credentials (project=%s).", project)

    _gee_initialised = True


# ---------------------------------------------------------------------------
# Shared pipeline builder
# ---------------------------------------------------------------------------

def _build_flood_pipeline(
    aoi,
    before_start: str,
    before_end: str,
    after_start: str,
    after_end: str,
):
    """
    Core Sentinel-1 flood-detection pipeline.

    Returns (before_img, after_img, flood_img) — all ee.Image objects.
    """
    import ee  # noqa: F811

    # ── 1. Sentinel-1 collection (strict filter) ─────────────────────────
    s1 = (
        ee.ImageCollection(_S1_COLLECTION)
        .filterBounds(aoi)
        .filterDate(before_start, after_end)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
        .select("VH")
    )

    before = s1.filterDate(before_start, before_end).median()
    after  = s1.filterDate(after_start,  after_end).median()

    # ── 2. Remove extreme noise ──────────────────────────────────────────
    before_masked = before.updateMask(before.gt(_NOISE_FLOOR_DB))
    after_masked  = after.updateMask(after.gt(_NOISE_FLOOR_DB))

    # ── 3. Smoothing ─────────────────────────────────────────────────────
    before_f = before_masked.focal_mean(_SMOOTHING_RADIUS_M, "circle", "meters")
    after_f  = after_masked.focal_mean(_SMOOTHING_RADIUS_M, "circle", "meters")

    # ── 4. Ratio & threshold ─────────────────────────────────────────────
    ratio = after_f.divide(before_f)
    flood = ratio.gt(_RATIO_THRESHOLD)

    # ── 5. Remove permanent water (JRC occurrence > 90) ──────────────────
    water = (
        ee.Image(_JRC_WATER)
        .select("occurrence")
        .gt(_WATER_OCCURRENCE)
    )
    flood = flood.updateMask(water.Not())

    # ── 6. Connected-pixel noise removal ─────────────────────────────────
    connected = flood.connectedPixelCount(_CONNECTED_MAX, True)
    flood = flood.updateMask(connected.gte(_CONNECTED_MIN))

    # ── 7. Slope filter (HydroSHEDS DEM, < 3°) ──────────────────────────
    dem   = ee.Image(_HYDRO_DEM)
    slope = ee.Algorithms.Terrain(dem).select("slope")
    flood = flood.updateMask(slope.lt(_MAX_SLOPE_DEG))

    return before_f, after_f, flood


# ---------------------------------------------------------------------------
# Public API — Tile URLs  (for /api/flood-tiles)
# ---------------------------------------------------------------------------

def generate_flood_tiles(
    country: str = "Kazakhstan",
    aoi_geojson: dict | None = None,
    before_start: str | None = None,
    before_end: str | None = None,
    after_start: str | None = None,
    after_end: str | None = None,
) -> dict[str, Any]:
    """
    Run the flood pipeline and return tile URL templates for Mapbox.

    Returns dict with:
      layers: {before, after, flood} each having tile_url, name, visible
      center: [lat, lng]
      zoom: int
      dates: {...}
    """
    if not _GEE_AVAILABLE or not _gee_initialised:
        logger.warning("GEE not available — returning mock.")
        return _mock_tiles(country)

    try:
        return _run_tile_pipeline(
            country,
            aoi_geojson,
            before_start or DEFAULT_DATES["before_start"],
            before_end   or DEFAULT_DATES["before_end"],
            after_start  or DEFAULT_DATES["after_start"],
            after_end    or DEFAULT_DATES["after_end"],
        )
    except Exception as exc:
        logger.error("GEE tile pipeline failed: %s", exc, exc_info=True)
        return _mock_tiles(country, error=str(exc))


def _run_tile_pipeline(
    country: str,
    aoi_geojson: dict | None,
    before_start: str,
    before_end: str,
    after_start: str,
    after_end: str,
) -> dict:
    """Run the GEE pipeline and return tile URLs."""
    import ee  # noqa: F811

    # ── Resolve AOI ──────────────────────────────────────────────────────
    if aoi_geojson:
        aoi = ee.Geometry(aoi_geojson)
        center = _centroid(aoi_geojson)
        zoom = 8
    else:
        countries = ee.FeatureCollection(_COUNTRIES)
        aoi = countries.filter(ee.Filter.eq("country_na", country))
        preset = PRESET_AOIS.get(country, {"center": [30, 60], "zoom": 6})
        center = preset["center"]
        zoom = preset["zoom"]

    # ── Run pipeline ─────────────────────────────────────────────────────
    before_f, after_f, flood = _build_flood_pipeline(
        aoi, before_start, before_end, after_start, after_end
    )

    # ── Generate tile URLs via getMapId ───────────────────────────────────
    before_mapid = before_f.getMapId({"min": -25, "max": 0})
    after_mapid  = after_f.getMapId({"min": -25, "max": 0})
    flood_mapid  = flood.getMapId({"palette": ["0000FF"]})

    def _extract_url(map_id_dict):
        """Extract tile URL from getMapId result (handles API version diffs)."""
        tf = map_id_dict.get("tile_fetcher")
        if tf and hasattr(tf, "url_format"):
            return tf.url_format
        if "urlFormat" in map_id_dict:
            return map_id_dict["urlFormat"]
        # Manual construction fallback
        mapid = map_id_dict.get("mapid", "")
        return f"https://earthengine.googleapis.com/v1/{mapid}/tiles/{{z}}/{{x}}/{{y}}"

    return {
        "layers": {
            "before": {
                "tile_url": _extract_url(before_mapid),
                "name": "Before SAR (VH)",
                "visible": False,
            },
            "after": {
                "tile_url": _extract_url(after_mapid),
                "name": "After SAR (VH)",
                "visible": False,
            },
            "flood": {
                "tile_url": _extract_url(flood_mapid),
                "name": "Flood Detection",
                "visible": True,
            },
        },
        "center": center,
        "zoom": zoom,
        "mock": False,
        "dates": {
            "before_period": f"{before_start} → {before_end}",
            "after_period":  f"{after_start} → {after_end}",
        },
    }


# ---------------------------------------------------------------------------
# Public API — GeoJSON flood map  (for /api/analyze)
# ---------------------------------------------------------------------------

def detect_flood(
    aoi_geojson: dict[str, Any],
    before_start: str,
    before_end: str,
    after_start: str,
    after_end: str,
) -> dict[str, Any]:
    """
    Run flood detection and return GeoJSON FeatureCollection.
    """
    if not _GEE_AVAILABLE or not _gee_initialised:
        logger.warning("GEE not available — returning mock flood map.")
        return _mock_flood_geojson(aoi_geojson)

    try:
        return _run_vector_pipeline(
            aoi_geojson, before_start, before_end, after_start, after_end
        )
    except Exception as exc:
        logger.error("GEE vector pipeline failed: %s", exc, exc_info=True)
        return _mock_flood_geojson(aoi_geojson)


def _run_vector_pipeline(
    aoi_geojson: dict,
    before_start: str,
    before_end: str,
    after_start: str,
    after_end: str,
) -> dict:
    """Vectorise the flood mask as GeoJSON."""
    import ee  # noqa: F811

    aoi = ee.Geometry(aoi_geojson)
    _, _, flood = _build_flood_pipeline(
        aoi, before_start, before_end, after_start, after_end
    )

    vectors = flood.reduceToVectors(
        geometry       = aoi,
        scale          = 30,
        geometryType   = "polygon",
        eightConnected = False,
        labelProperty  = "flood",
        maxPixels      = 1e8,
    )

    geojson = vectors.getInfo()

    for feat in geojson.get("features", []):
        feat.setdefault("properties", {})
        feat["properties"].update({
            "source":        "Sentinel-1 SAR (DESCENDING / VH)",
            "before_period": f"{before_start} → {before_end}",
            "after_period":  f"{after_start} → {after_end}",
            "pipeline":      "ratio>1.4 | JRC>90 | slope<3° | connected≥20",
        })

    return geojson


# ---------------------------------------------------------------------------
# Feature extraction for ML
# ---------------------------------------------------------------------------

def extract_aoi_features(aoi_geojson: dict) -> dict[str, float]:
    """Pull GEE-derived features for ML flood-risk model."""
    if not _GEE_AVAILABLE or not _gee_initialised:
        return _mock_features()

    try:
        return _gee_extract_features(aoi_geojson)
    except Exception as exc:
        logger.error("Feature extraction failed: %s", exc, exc_info=True)
        return _mock_features()


def _gee_extract_features(aoi_geojson: dict) -> dict[str, float]:
    import ee  # noqa: F811

    aoi = ee.Geometry(aoi_geojson)

    # Elevation & slope (HydroSHEDS)
    dem   = ee.Image(_HYDRO_DEM)
    slope = ee.Algorithms.Terrain(dem).select("slope")
    elev_stats  = dem.reduceRegion(ee.Reducer.mean(), aoi, 90).getInfo()
    slope_stats = slope.reduceRegion(ee.Reducer.mean(), aoi, 90).getInfo()

    # Recent Sentinel-1 backscatter
    s1_recent = (
        ee.ImageCollection(_S1_COLLECTION)
        .filterBounds(aoi)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
        .select("VH")
        .sort("system:time_start", False)
        .limit(5)
        .mean()
    )
    s1_stats = s1_recent.reduceRegion(ee.Reducer.mean(), aoi, 90).getInfo()

    # JRC water proximity
    jrc      = ee.Image(_JRC_WATER).select("occurrence").gt(_WATER_OCCURRENCE)
    dist_wat = jrc.Not().cumulativeCost(source=jrc, maxDistance=50000).rename("dist")
    dist_stats = dist_wat.reduceRegion(ee.Reducer.mean(), aoi, 90).getInfo()

    return {
        "elevation":         float(elev_stats.get("b1", 100)),
        "slope":             float(slope_stats.get("slope", 2)),
        "s1_backscatter_vh": float(s1_stats.get("VH", -15)),
        "dist_to_river_m":   float(dist_stats.get("dist", 5000)),
        "rainfall_mm":       50.0,     # placeholder — plug CHIRPS
        "soil_moisture":     0.35,     # placeholder — plug ERA5
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _centroid(geojson: dict) -> list:
    coords = geojson.get("coordinates", [[]])
    ring = coords[0] if coords else []
    if len(ring) < 3:
        return [30, 60]
    cx = sum(p[0] for p in ring) / len(ring)
    cy = sum(p[1] for p in ring) / len(ring)
    return [cy, cx]  # [lat, lng]


# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------

def _mock_tiles(country: str, error: str | None = None) -> dict:
    preset = PRESET_AOIS.get(country, {"center": [48.0, 67.0], "zoom": 5})
    return {
        "layers": {},
        "center": preset["center"],
        "zoom":   preset["zoom"],
        "mock":   True,
        "dates":  DEFAULT_DATES,
        "ee_app_url": "https://solar-modem-468207-q0.projects.earthengine.app/view/geonix",
        "message": error or "GEE not authenticated. Falling back to Earth Engine App.",
    }


def _mock_flood_geojson(aoi_geojson: dict) -> dict:
    coords = aoi_geojson.get("coordinates", [[]])
    ring   = coords[0] if coords else []

    if len(ring) < 3:
        flood_ring = [[-0.1, 51.4], [-0.05, 51.4], [-0.05, 51.45], [-0.1, 51.4]]
    else:
        cx = sum(p[0] for p in ring) / len(ring)
        cy = sum(p[1] for p in ring) / len(ring)
        flood_ring = [
            [cx - 0.02, cy - 0.02],
            [cx + 0.02, cy - 0.02],
            [cx + 0.02, cy + 0.02],
            [cx - 0.02, cy + 0.02],
            [cx - 0.02, cy - 0.02],
        ]

    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [flood_ring]},
            "properties": {"source": "MOCK — GEE not connected", "flood": 1},
        }],
    }


def _mock_features() -> dict[str, float]:
    return {
        "rainfall_mm":       120.0,
        "elevation":         45.0,
        "slope":             1.8,
        "soil_moisture":     0.55,
        "dist_to_river_m":   800.0,
        "s1_backscatter_vh": -18.3,
    }
