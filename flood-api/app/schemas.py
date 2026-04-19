"""
Pydantic schemas for request / response validation.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# GeoJSON primitives (minimal — enough for polygon AOI)
# ---------------------------------------------------------------------------

class GeoJSONGeometry(BaseModel):
    type: Literal["Polygon", "MultiPolygon"]
    coordinates: list[Any]

    @model_validator(mode="after")
    def check_coordinates_not_empty(self) -> "GeoJSONGeometry":
        if not self.coordinates:
            raise ValueError("coordinates must not be empty")
        return self


class GeoJSONFeature(BaseModel):
    type: Literal["Feature"]
    geometry: GeoJSONGeometry
    properties: dict[str, Any] = Field(default_factory=dict)


class GeoJSONFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"]
    features: list[GeoJSONFeature]


# ---------------------------------------------------------------------------
# /analyze  input
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    """
    Accepts either:
      • a bare GeoJSON Polygon/MultiPolygon geometry
      • a GeoJSON Feature wrapping a geometry
      • a FeatureCollection (first feature is used as AOI)

    Optionally includes date range for the flood event.
    """

    aoi: GeoJSONGeometry | GeoJSONFeature | GeoJSONFeatureCollection

    # Date range (ISO 8601). Defaults applied in the service layer.
    before_start: str | None = Field(None, example="2024-06-01")
    before_end: str | None = Field(None, example="2024-06-30")
    after_start: str | None = Field(None, example="2024-07-01")
    after_end: str | None = Field(None, example="2024-07-31")

    def geometry(self) -> GeoJSONGeometry:
        """Normalise any of the three accepted shapes to a single Geometry."""
        aoi = self.aoi
        if isinstance(aoi, GeoJSONFeatureCollection):
            return aoi.features[0].geometry
        if isinstance(aoi, GeoJSONFeature):
            return aoi.geometry
        return aoi  # already a Geometry


# ---------------------------------------------------------------------------
# /analyze  output
# ---------------------------------------------------------------------------

class AnalyzeResponse(BaseModel):
    flood_map: dict[str, Any] = Field(
        ...,
        description="GeoJSON FeatureCollection — flooded area polygons.",
    )
    risk_score: float = Field(
        ..., ge=0.0, le=1.0,
        description="Flood probability 0–1 from the AI model.",
    )
    risk_level: Literal["low", "medium", "high"] = Field(
        ..., description="Thresholded risk category.",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Processing metadata (dates used, pixel counts, …).",
    )


# ---------------------------------------------------------------------------
# /flood-tiles  input / output
# ---------------------------------------------------------------------------

class FloodTileRequest(BaseModel):
    """Request GEE flood-detection tile URLs for a country or custom AOI."""

    country: str = Field(
        "Kazakhstan",
        description="Preset country name for AOI (USDOS/LSIB_SIMPLE).",
    )
    aoi: GeoJSONGeometry | None = Field(
        None,
        description="Optional custom AOI (overrides country if provided).",
    )
    before_start: str | None = Field(None, example="2024-09-01")
    before_end: str | None = Field(None, example="2025-09-10")
    after_start: str | None = Field(None, example="2024-10-15")
    after_end: str | None = Field(None, example="2025-10-25")


class TileLayerInfo(BaseModel):
    tile_url: str = Field(..., description="XYZ tile URL template for Mapbox.")
    name: str = Field(..., description="Human-readable layer name.")
    visible: bool = Field(True, description="Whether layer is visible by default.")


class FloodTileResponse(BaseModel):
    layers: dict[str, TileLayerInfo] = Field(
        default_factory=dict,
        description="Dict of layer_id → tile info (before, after, flood).",
    )
    center: list[float] = Field(
        ..., description="Map center [lat, lng].",
    )
    zoom: int = Field(..., description="Initial zoom level.")
    mock: bool = Field(False, description="True if GEE was unavailable.")
    dates: dict[str, str] = Field(
        default_factory=dict,
        description="Date windows used for analysis.",
    )
    ee_app_url: str | None = Field(
        None,
        description="Fallback URL to Earth Engine App (when mock=true).",
    )
    message: str | None = Field(
        None,
        description="Status message (errors, warnings).",
    )
