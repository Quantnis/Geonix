/**
 * Geonix Flood API — Mapbox Frontend Integration
 * ================================================
 * Drop this into your existing Mapbox GL JS page.
 *
 * Prerequisites
 *   • mapbox-gl already loaded and `map` instance exists
 *   • @mapbox/mapbox-gl-draw loaded for polygon drawing
 *
 * Usage
 *   1. Add the Draw control to your map (see addDrawControl)
 *   2. Call analyzeDrawnArea() after the user finishes drawing
 *   3. The flood polygon layer + risk badge are rendered automatically
 */

// ─── Config ─────────────────────────────────────────────────────────────────
const FLOOD_API_URL = "http://localhost:8000/api/analyze";

// ─── Mapbox Draw setup ───────────────────────────────────────────────────────
function addDrawControl(map) {
  const draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: { polygon: true, trash: true },
    defaultMode: "draw_polygon",
  });
  map.addControl(draw, "top-left");

  // Auto-analyze when user finishes drawing
  map.on("draw.create", (e) => analyzeDrawnArea(map, draw, e));
  map.on("draw.update", (e) => analyzeDrawnArea(map, draw, e));

  return draw;
}

// ─── Main: send AOI to backend ───────────────────────────────────────────────
async function analyzeDrawnArea(map, draw, event) {
  const features = draw.getAll().features;
  if (!features.length) return;

  const aoi = features[0].geometry; // Polygon GeoJSON geometry

  showLoadingBadge("Analyzing flood risk…");

  try {
    const res = await fetch(FLOOD_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aoi,
        // Optional — leave out to let the backend use recent defaults
        // before_start: "2024-06-01",
        // before_end:   "2024-06-30",
        // after_start:  "2024-07-01",
        // after_end:    "2024-07-31",
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    renderFloodLayer(map, data.flood_map);
    showRiskBadge(data.risk_score, data.risk_level);
  } catch (err) {
    console.error("Flood API error:", err);
    showErrorBadge(err.message);
  }
}

// ─── Render flood mask on map ────────────────────────────────────────────────
function renderFloodLayer(map, floodGeoJSON) {
  const SOURCE_ID = "flood-detection";
  const FILL_ID   = "flood-fill";
  const LINE_ID   = "flood-outline";

  // Remove stale layers
  [FILL_ID, LINE_ID].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

  map.addSource(SOURCE_ID, { type: "geojson", data: floodGeoJSON });

  // Semi-transparent blue fill
  map.addLayer({
    id: FILL_ID,
    type: "fill",
    source: SOURCE_ID,
    paint: {
      "fill-color": "#1e90ff",
      "fill-opacity": 0.45,
    },
  });

  // Solid outline
  map.addLayer({
    id: LINE_ID,
    type: "line",
    source: SOURCE_ID,
    paint: {
      "line-color": "#0050c8",
      "line-width": 1.5,
    },
  });
}

// ─── UI badges ───────────────────────────────────────────────────────────────
const RISK_COLORS = { low: "#2BB673", medium: "#F5A623", high: "#FF3D3D" };

function showRiskBadge(score, level) {
  let badge = document.getElementById("flood-risk-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "flood-risk-badge";
    Object.assign(badge.style, {
      position: "absolute", top: "16px", right: "16px", zIndex: 10,
      background: "rgba(10,18,14,0.92)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px", padding: "14px 20px", fontFamily: "monospace",
      color: "#e0f0ea", backdropFilter: "blur(12px)", minWidth: "180px",
    });
    document.getElementById("map").appendChild(badge);
  }

  const pct    = Math.round(score * 100);
  const color  = RISK_COLORS[level] || "#aaa";
  badge.innerHTML = `
    <div style="font-size:10px;letter-spacing:.1em;color:#6acea0;margin-bottom:8px;">FLOOD RISK ASSESSMENT</div>
    <div style="font-size:28px;font-weight:700;color:${color};line-height:1">${pct}<span style="font-size:14px">%</span></div>
    <div style="font-size:12px;color:${color};text-transform:uppercase;letter-spacing:.08em;margin-top:4px">${level} risk</div>
    <div style="width:100%;height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin-top:10px;">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:2px;"></div>
    </div>`;
}

function showLoadingBadge(msg) {
  showRiskBadge(0, "low");
  const badge = document.getElementById("flood-risk-badge");
  if (badge) badge.innerHTML =
    `<div style="font-size:11px;color:#6acea0;letter-spacing:.08em;">${msg}</div>`;
}

function showErrorBadge(msg) {
  const badge = document.getElementById("flood-risk-badge");
  if (badge) badge.innerHTML =
    `<div style="font-size:11px;color:#ff5f63;">⚠ ${msg}</div>`;
}
