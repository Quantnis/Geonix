"""
XGBoost Flood Risk Model
------------------------

Features (6)
  rainfall_mm        — accumulated rainfall for the period (mm)
  elevation          — mean AOI elevation (m, SRTM)
  slope              — mean AOI slope (degrees, SRTM)
  soil_moisture      — fractional volumetric (0–1)
  dist_to_river_m    — Euclidean distance to nearest permanent water (m, JRC)
  s1_backscatter_vh  — mean Sentinel-1 VH backscatter (dB)

Output
  risk_score  float 0–1   (XGBoost predicted probability of flooding)
  risk_level  str          low | medium | high

Training data
  A realistic synthetic dataset is generated here for a self-contained
  baseline.  Replace  _generate_synthetic_data()  with your real labelled
  dataset (CSV / parquet) when available.
"""

from __future__ import annotations

import logging
import os
import pickle
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger("geonix.ml")

_MODEL_PATH = Path(__file__).parent / "flood_model.pkl"

# Risk thresholds
_LOW_THRESHOLD    = 0.35
_MEDIUM_THRESHOLD = 0.65

FEATURE_NAMES = [
    "rainfall_mm",
    "elevation",
    "slope",
    "soil_moisture",
    "dist_to_river_m",
    "s1_backscatter_vh",
]


# ---------------------------------------------------------------------------
# Risk level helper
# ---------------------------------------------------------------------------

def score_to_level(score: float) -> str:
    if score < _LOW_THRESHOLD:
        return "low"
    if score < _MEDIUM_THRESHOLD:
        return "medium"
    return "high"


# ---------------------------------------------------------------------------
# Synthetic training data  (replace with real labelled samples)
# ---------------------------------------------------------------------------

def _generate_synthetic_data(
    n_samples: int = 2_000,
    seed: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate realistic synthetic flood training samples.

    Physics-inspired rules:
      • High rainfall + low elevation + flat slope + wet soil + near river
        → high flood probability
      • Low backscatter  (very negative VH dB after rain) also correlates
        with flooding (SAR double-bounce / specular reflection from water)
    """
    rng = np.random.default_rng(seed)

    rainfall        = rng.uniform(0, 300, n_samples)       # mm
    elevation       = rng.uniform(0, 500, n_samples)       # m
    slope           = rng.uniform(0, 15,  n_samples)       # degrees
    soil_moisture   = rng.uniform(0, 1,   n_samples)       # 0–1
    dist_to_river   = rng.uniform(0, 20_000, n_samples)    # m
    s1_backscatter  = rng.uniform(-25, -5, n_samples)      # dB

    X = np.column_stack([
        rainfall, elevation, slope, soil_moisture,
        dist_to_river, s1_backscatter,
    ])

    # Deterministic flood score (ground-truth signal)
    flood_score = (
          0.35 * (rainfall / 300)
        + 0.20 * (1 - elevation / 500)
        + 0.10 * (1 - slope / 15)
        + 0.15 * soil_moisture
        + 0.15 * (1 - dist_to_river / 20_000)
        + 0.05 * ((-5 - s1_backscatter) / 20)   # more negative → wetter
    )
    flood_score = np.clip(flood_score, 0, 1)

    # Add noise and binarise
    noisy = flood_score + rng.normal(0, 0.08, n_samples)
    y = (np.clip(noisy, 0, 1) > 0.5).astype(int)

    return X, y


# ---------------------------------------------------------------------------
# FloodRiskModel
# ---------------------------------------------------------------------------

class FloodRiskModel:
    """
    Wrapper around an XGBoost classifier.

    Usage
    -----
    model = FloodRiskModel()
    model.ensure_trained()                 # train or load cached model
    result = model.predict(feature_dict)  # {"risk_score": 0.73, "risk_level": "high"}
    """

    def __init__(self) -> None:
        self._clf = None

    # ------------------------------------------------------------------
    # Training / loading
    # ------------------------------------------------------------------

    def ensure_trained(self) -> None:
        """Load saved model or train from scratch if none exists."""
        if _MODEL_PATH.exists():
            self._load()
        else:
            logger.info("No saved model found — training from synthetic data …")
            self._train_and_save()

    def _train_and_save(self) -> None:
        try:
            from xgboost import XGBClassifier  # type: ignore
            from sklearn.model_selection import train_test_split
            from sklearn.metrics import classification_report
        except ImportError as exc:
            raise RuntimeError(
                "xgboost / scikit-learn not installed. "
                "Run:  pip install xgboost scikit-learn"
            ) from exc

        X, y = _generate_synthetic_data()
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        clf = XGBClassifier(
            n_estimators         = 300,
            max_depth            = 6,
            learning_rate        = 0.05,
            subsample            = 0.8,
            colsample_bytree     = 0.8,
            use_label_encoder    = False,
            eval_metric          = "logloss",
            random_state         = 42,
            tree_method          = "hist",   # CPU-friendly
        )
        clf.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False,
        )

        report = classification_report(y_test, clf.predict(X_test))
        logger.info("Training complete.\n%s", report)

        _MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(_MODEL_PATH, "wb") as f:
            pickle.dump(clf, f)
        logger.info("Model saved → %s", _MODEL_PATH)
        self._clf = clf

    def _load(self) -> None:
        with open(_MODEL_PATH, "rb") as f:
            self._clf = pickle.load(f)
        logger.info("Model loaded from cache → %s", _MODEL_PATH)

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def predict(self, features: dict[str, Any]) -> dict[str, Any]:
        """
        Parameters
        ----------
        features  dict with keys matching FEATURE_NAMES.

        Returns
        -------
        {
          "risk_score": float,           # XGBoost flood probability 0–1
          "risk_level": "low|medium|high",
          "feature_importances": dict,   # optional debug info
        }
        """
        if self._clf is None:
            logger.warning("Model not ready — returning neutral score.")
            return {"risk_score": 0.5, "risk_level": "medium",
                    "feature_importances": {}}

        row = np.array(
            [[features.get(f, 0.0) for f in FEATURE_NAMES]],
            dtype=np.float32,
        )

        proba = float(self._clf.predict_proba(row)[0][1])
        level = score_to_level(proba)

        # Feature importances for debugging / front-end tooltip
        importances = {
            name: float(imp)
            for name, imp in zip(
                FEATURE_NAMES,
                self._clf.feature_importances_,
            )
        }

        return {
            "risk_score"          : round(proba, 4),
            "risk_level"          : level,
            "feature_importances" : importances,
        }

    # ------------------------------------------------------------------
    # Re-train with real data (called from a future /retrain endpoint)
    # ------------------------------------------------------------------

    def retrain(self, X: np.ndarray, y: np.ndarray) -> dict[str, Any]:
        """Retrain the model on newly labelled data and persist."""
        logger.info("Retraining on %d samples …", len(X))
        self._clf = None
        _MODEL_PATH.unlink(missing_ok=True)
        self._train_and_save()
        return {"status": "ok", "samples": len(X)}
