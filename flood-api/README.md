# Geonix Flood Detection API

FastAPI backend that connects **Mapbox GL JS** to **Google Earth Engine** (Sentinel-1 SAR flood detection) and an **XGBoost** flood risk AI model.

---

## Project Structure

```
flood-api/
├── main.py                      ← FastAPI app + startup lifecycle
├── requirements.txt
├── .env.example                 ← copy to .env and fill in credentials
├── mapbox_integration.js        ← drop into your Mapbox frontend
└── app/
    ├── schemas.py               ← Pydantic request/response models
    ├── routers/
    │   └── analyze.py           ← POST /api/analyze endpoint
    └── services/
        ├── gee_client.py        ← Google Earth Engine pipeline
        └── ml_model.py          ← XGBoost flood risk model
```

---

## Quick Start

### 1 — Python environment

```bash
cd flood-api
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2 — Google Earth Engine credentials

**Option A — Service Account (recommended for production)**

1. Create a GEE-enabled project in [Google Cloud Console](https://console.cloud.google.com).
2. Create a Service Account, grant it the *Earth Engine Resource Viewer* role.
3. Download the JSON key → save as `flood-api/gee-key.json`.
4. Copy `.env.example` to `.env` and set:

```dotenv
GEE_SERVICE_ACCOUNT=your-sa@your-project.iam.gserviceaccount.com
GEE_KEY_FILE=./gee-key.json
```

**Option B — Personal credentials (local dev, quick setup)**

```bash
pip install earthengine-api
earthengine authenticate        # opens browser, saves ~/.config/earthengine/credentials
```

Leave `GEE_SERVICE_ACCOUNT` and `GEE_KEY_FILE` blank in `.env` — the API will use ADC automatically.

> **No GEE credentials?** The API still works — it returns a realistic *mock* flood polygon and a model-predicted risk score. Perfect for frontend development.

---

### 3 — Run the server

```bash
# From the flood-api/ directory
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open the interactive docs: **http://localhost:8000/docs**

---

## API Reference

### `POST /api/analyze`

**Request body**

```jsonc
{
  // Any of: bare Geometry, Feature, or FeatureCollection
  "aoi": {
    "type": "Polygon",
    "coordinates": [
      [
        [73.0, 33.5],
        [73.5, 33.5],
        [73.5, 34.0],
        [73.0, 34.0],
        [73.0, 33.5]
      ]
    ]
  },

  // Optional — defaults to last 30/60 days if omitted
  "before_start": "2024-06-01",
  "before_end":   "2024-06-30",
  "after_start":  "2024-07-01",
  "after_end":    "2024-07-31"
}
```

**Response**

```jsonc
{
  "flood_map": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Polygon", "coordinates": [[...]] },
        "properties": {
          "flood": 1,
          "source": "Sentinel-1 SAR",
          "before_period": "2024-06-01 → 2024-06-30",
          "after_period":  "2024-07-01 → 2024-07-31",
          "threshold_db": -3.0
        }
      }
    ]
  },
  "risk_score": 0.8312,      // XGBoost probability 0–1
  "risk_level": "high",      // "low" | "medium" | "high"
  "metadata": {
    "before_period": "2024-06-01 → 2024-06-30",
    "after_period":  "2024-07-01 → 2024-07-31",
    "flooded_features": 3,
    "ml_features_used": {
      "rainfall_mm": 120.0,
      "elevation": 45.0,
      "slope": 1.8,
      "soil_moisture": 0.55,
      "dist_to_river_m": 800.0,
      "s1_backscatter_vh": -18.3
    },
    "feature_importances": { ... }
  }
}
```

### `GET /health`

```json
{ "status": "ok", "service": "geonix-flood-api" }
```

---

## Connecting to Mapbox

1. Copy `mapbox_integration.js` into your frontend.
2. Import `@mapbox/mapbox-gl-draw` in your HTML:

```html
<link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.css">
<script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.js"></script>
```

3. After your `mapboxgl.Map` is created, call:

```js
const draw = addDrawControl(map);
```

4. The user draws a polygon → the backend is called automatically → flooded areas render as a blue layer, risk badge appears top-right.

---

## GEE Processing Pipeline

```
Sentinel-1 GRD (IW, VH)
  ├── Filter by AOI + date range
  ├── Mean composite: BEFORE image
  ├── Mean composite: AFTER image
  ├── Compute ratio (after/before dB) → threshold at −3 dB
  ├── Remove permanent water (JRC GSW ≥10 months/yr)
  ├── Remove steep terrain (SRTM slope > 5°)
  ├── Morphological opening (erode→dilate, 1px kernel) — noise removal
  └── Vectorise → GeoJSON FeatureCollection
```

## ML Model Features

| Feature | Source | Unit |
|---------|--------|------|
| `rainfall_mm` | CHIRPS / NOAA (placeholder) | mm |
| `elevation` | SRTM via GEE | metres |
| `slope` | SRTM terrain via GEE | degrees |
| `soil_moisture` | SMAP / placeholder | 0–1 |
| `dist_to_river_m` | JRC GSW cumulative cost via GEE | metres |
| `s1_backscatter_vh` | Sentinel-1 VH via GEE | dB |

The model trains automatically on first run using a physics-inspired synthetic dataset (2,000 samples). Replace `_generate_synthetic_data()` in `ml_model.py` with your real labelled CSV to improve accuracy.

---

## Replacing Synthetic Data with Real Labels

```python
import numpy as np
import pandas as pd
from app.services.ml_model import FloodRiskModel

df = pd.read_csv("my_flood_labels.csv")
X  = df[["rainfall_mm","elevation","slope","soil_moisture",
         "dist_to_river_m","s1_backscatter_vh"]].values
y  = df["flooded"].values        # 0 or 1

model = FloodRiskModel()
model.retrain(X, y)
```

---

## CORS

By default, requests from `http://localhost:3117` (Geonix Mapbox frontend) are allowed. Update `ALLOWED_ORIGINS` in `.env` for production:

```dotenv
ALLOWED_ORIGINS=https://your-mapbox-app.com
```
