"""
Geonix Flood Detection API — Entry Point
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analyze
from app.services.gee_client import init_earth_engine
from app.services.ml_model import FloodRiskModel

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s | %(levelname)s | %(name)s — %(message)s",
)
logger = logging.getLogger("geonix.flood_api")


# ---------------------------------------------------------------------------
# Shared app state (initialized once at startup)
# ---------------------------------------------------------------------------
_model: FloodRiskModel | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize heavy resources on startup and clean up on shutdown."""
    global _model

    logger.info("Initializing Google Earth Engine …")
    try:
        init_earth_engine()
        logger.info("GEE authenticated ✓")
    except Exception as exc:
        logger.warning(f"GEE init failed (will use mock data): {exc}")

    logger.info("Loading / training flood risk ML model …")
    _model = FloodRiskModel()
    _model.ensure_trained()
    logger.info("ML model ready ✓")

    # Attach model to app state so routers can access it
    app.state.model = _model

    yield

    logger.info("Shutting down Flood API …")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Geonix Flood Detection API",
    description="Satellite-based flood detection (Sentinel-1 / GEE) + AI flood risk prediction.",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3117"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(analyze.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "geonix-flood-api"}
