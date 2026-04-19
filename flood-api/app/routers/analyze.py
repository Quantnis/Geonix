"""
POST /api/analyze  — Flood analysis router

Flow
----
1. Parse + validate GeoJSON AOI from request body.
2. Apply sensible default date windows if none provided.
3. Call GEE flood-detection pipeline  → flood_map GeoJSON.
4. Extract numerical features from GEE for the same AOI.
5. Run XGBoost model → risk_score + risk_level.
6. Return combined AnalyzeResponse.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from app.schemas import AnalyzeRequest, AnalyzeResponse, FloodTileRequest, FloodTileResponse
from app.services.gee_client import detect_flood, extract_aoi_features, generate_flood_tiles

logger = logging.getLogger("geonix.router.analyze")

router = APIRouter(tags=["Flood Analysis"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _default_dates() -> tuple[str, str, str, str]:
    """
    Sensible default windows:
      BEFORE  = 30–60 days ago
      AFTER   = 0–30 days ago  (recent)
    """
    today        = date.today()
    after_end    = today.isoformat()
    after_start  = (today - timedelta(days=30)).isoformat()
    before_end   = (today - timedelta(days=31)).isoformat()
    before_start = (today - timedelta(days=60)).isoformat()
    return before_start, before_end, after_start, after_end


def _count_flooded_pixels(flood_map: dict[str, Any]) -> int:
    """Rough proxy: count returned flood features."""
    return len(flood_map.get("features", []))


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Flood detection + AI risk assessment for a drawn AOI",
    response_description="Flood GeoJSON mask + AI risk score",
)
async def analyze(request: Request, body: AnalyzeRequest) -> AnalyzeResponse:
    """
    **Input (JSON body)**

    ```json
    {
      "aoi": {
        "type": "Polygon",
        "coordinates": [[[lon, lat], ...]]
      },
      "before_start": "2024-06-01",
      "before_end":   "2024-06-30",
      "after_start":  "2024-07-01",
      "after_end":    "2024-07-31"
    }
    ```

    **Output**

    ```json
    {
      "flood_map":  { "type": "FeatureCollection", "features": [...] },
      "risk_score": 0.78,
      "risk_level": "high",
      "metadata":   { ... }
    }
    ```
    """
    # ------------------------------------------------------------------ #
    # 1. Extract normalised geometry                                        #
    # ------------------------------------------------------------------ #
    try:
        geometry = body.geometry()
        aoi_dict = geometry.model_dump()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid AOI geometry: {exc}",
        )

    # ------------------------------------------------------------------ #
    # 2. Date windows                                                       #
    # ------------------------------------------------------------------ #
    defaults = _default_dates()
    before_start = body.before_start or defaults[0]
    before_end   = body.before_end   or defaults[1]
    after_start  = body.after_start  or defaults[2]
    after_end    = body.after_end    or defaults[3]

    logger.info(
        "Analyzing AOI | before %s→%s | after %s→%s",
        before_start, before_end, after_start, after_end,
    )

    # ------------------------------------------------------------------ #
    # 3. GEE flood detection                                               #
    # ------------------------------------------------------------------ #
    try:
        flood_map = detect_flood(
            aoi_geojson  = aoi_dict,
            before_start = before_start,
            before_end   = before_end,
            after_start  = after_start,
            after_end    = after_end,
        )
    except Exception as exc:
        logger.error("Flood detection error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Flood detection failed. Check GEE credentials.",
        )

    # ------------------------------------------------------------------ #
    # 4. Feature extraction for ML                                         #
    # ------------------------------------------------------------------ #
    try:
        features = extract_aoi_features(aoi_dict)
    except Exception as exc:
        logger.warning("Feature extraction failed (%s) — using zeros.", exc)
        features = {k: 0.0 for k in [
            "rainfall_mm", "elevation", "slope",
            "soil_moisture", "dist_to_river_m", "s1_backscatter_vh",
        ]}

    # ------------------------------------------------------------------ #
    # 5. ML risk prediction                                                #
    # ------------------------------------------------------------------ #
    model = request.app.state.model
    prediction = model.predict(features)

    risk_score = prediction["risk_score"]
    risk_level = prediction["risk_level"]

    # ------------------------------------------------------------------ #
    # 6. Compose response                                                  #
    # ------------------------------------------------------------------ #
    metadata = {
        "before_period"      : f"{before_start} → {before_end}",
        "after_period"       : f"{after_start} → {after_end}",
        "flooded_features"   : _count_flooded_pixels(flood_map),
        "ml_features_used"   : features,
        "feature_importances": prediction.get("feature_importances", {}),
    }

    logger.info(
        "Analysis complete | risk_score=%.3f | risk_level=%s | flooded_features=%d",
        risk_score, risk_level, metadata["flooded_features"],
    )

    return AnalyzeResponse(
        flood_map  = flood_map,
        risk_score = risk_score,
        risk_level = risk_level,
        metadata   = metadata,
    )


@router.post(
    "/flood-tiles",
    response_model=FloodTileResponse,
    summary="Get Earth Engine tile URLs for flood visualization",
    response_description="Mapbox XYZ tile URLs for before, after, and flood masks",
)
async def get_flood_tiles(body: FloodTileRequest) -> FloodTileResponse:
    """
    **Input (JSON body)**

    ```json
    {
      "country": "Kazakhstan",
      "before_start": "2024-09-01",
      "before_end":   "2025-09-10",
      "after_start":  "2024-10-15",
      "after_end":    "2025-10-25"
    }
    ```
    """
    logger.info("Generating tiles for %s", body.country or "Custom AOI")

    aoi_dict = None
    if body.aoi:
        try:
            aoi_dict = body.aoi.model_dump()
        except Exception as exc:
            pass

    tiles = generate_flood_tiles(
        country=body.country,
        aoi_geojson=aoi_dict,
        before_start=body.before_start,
        before_end=body.before_end,
        after_start=body.after_start,
        after_end=body.after_end,
    )

    return FloodTileResponse(**tiles)
