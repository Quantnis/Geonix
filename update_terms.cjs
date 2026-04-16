const fs = require('fs');

const filePath = '/home/yerbol/Documents/geonix/Crucix/dashboard/public/jarvis.html';
let content = fs.readFileSync(filePath, 'utf-8');

// Global replaces
const replaces = [
  [/wartime/gi, match => match === match.toUpperCase() ? "HIGH-RISK" : (match[0] === match[0].toUpperCase() ? "High-risk" : "high-risk")],
  [/conflict/gi, match => match === match.toUpperCase() ? "DISASTER EVENT" : (match[0] === match[0].toUpperCase() ? "Disaster event" : "disaster event")],
  [/military/gi, match => match === match.toUpperCase() ? "EMERGENCY" : (match[0] === match[0].toUpperCase() ? "Emergency" : "emergency")],
  [/\b(strike|attack)\b/gi, match => match === match.toUpperCase() ? "DISASTER IMPACT" : (match[0] === match[0].toUpperCase() ? "Disaster impact" : "disaster impact")],
  [/strikes/gi, match => match === match.toUpperCase() ? "DISASTER IMPACTS" : (match[0] === match[0].toUpperCase() ? "Disaster impacts" : "disaster impacts")],
  [/attacks/gi, match => match === match.toUpperCase() ? "DISASTER IMPACTS" : (match[0] === match[0].toUpperCase() ? "Disaster impacts" : "disaster impacts")],
  [/\bOSINT\b/g, "SENSOR DATA"],
  [/\bosint\b/g, "sensor data"],
  [/\bIntelligence\b/g, "Prediction Data"],
  [/\bintelligence\b/g, "prediction data"],
  [/\bINTELLIGENCE\b/g, "PREDICTION DATA"],
  [/\btheaters\b/gi, match => match === match.toUpperCase() ? "REGIONS" : (match[0] === match[0].toUpperCase() ? "Regions" : "regions")],
  [/\btheater\b/gi, match => match === match.toUpperCase() ? "REGION" : (match[0] === match[0].toUpperCase() ? "Region" : "region")],
  [/\bkinetic\b/gi, match => match === match.toUpperCase() ? "ACTIVE" : (match[0] === match[0].toUpperCase() ? "Active" : "active")],
  [/\bSIGINT\b/g, "NOAA"],
  [/\bHUMINT\b/g, "FIRMS"],
  [/CRUCIX MONITOR/g, "GEONIX"],
  [/CRUCIX/g, "GEONIX"],
  [/WARTIME STAGFLATION RISK/g, "DISASTER INTELLIGENCE PLATFORM"],
  [/SWEEP 30\.1s/g, "REFRESH 30s"],
  [/SOURCES 28\/29/g, "FEEDS 6/7"],
  [/WHAT SIGNALS MEAN/gi, match => match === match.toUpperCase() ? "SIGNAL LEGEND" : "Signal Legend"],
];

replaces.forEach(([regexp, replaceStr]) => {
  content = content.replace(regexp, replaceStr);
});

// Update the Topbar rendering code directly with regex
const renderTopbarRegex = /function renderTopbar\(\)\{[\s\S]*?renderRegionControls\(\);\s*\}/;
const newRenderTopbar = 
"const getGlobalAlertState = (threats) => {\n" +
"  const maxSeverity = (threats || []).reduce((max, t) => {\n" +
"    if (t.severity === 'critical') return 'critical';\n" +
"    if (t.severity === 'warning' && max !== 'critical') return 'warning';\n" +
"    return max;\n" +
"  }, 'monitoring');\n" +
"  \n" +
"  return {\n" +
"    critical:   { text: '● CRITICAL DISASTER RISK',  color: '#FF3D3D' },\n" +
"    warning:    { text: '● ELEVATED RISK CONDITIONS', color: '#F5A623' },\n" +
"    monitoring: { text: '● MONITORING — ALL SYSTEMS', color: '#00E5C8' }\n" +
"  }[maxSeverity];\n" +
"};\n\n" +
"function renderTopbar(){\n" +
"  const mobile = isMobileLayout();\n" +
"  const ts = new Date(D.meta.timestamp);\n" +
"  const d = ts.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase();\n" +
"  const timeStr = ts.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});\n" +
"  const alertState = getGlobalAlertState(D.threats || []);\n" +
"  \n" +
"  document.getElementById('topbar').innerHTML=`\n" +
"    <div class=\"top-left\">\n" +
"      <span class=\"brand\">GEONIX</span>\n" +
"      <span class=\"brand\" style=\"opacity: 0.6; font-size: 11px; margin-left:8px; padding-top:2px\">● DISASTER INTELLIGENCE PLATFORM</span>\n" +
"      <span class=\"regime-chip\" style=\"margin-left: 12px; color: ${alertState.color}; border-color: ${alertState.color}; background: ${alertState.color}15\"><span class=\"blink\" style=\"background: ${alertState.color}; box-shadow: 0 0 8px ${alertState.color}\"></span>${alertState.text.replace('● ', '')}</span>\n" +
"    </div>\n" +
"    ${mobile ? \\`<div class=\"top-center\">${getRegionControlsMarkup()}</div>\\` : ''}\n" +
"    <div class=\"top-right\">\n" +
"      <button class=\"meta-pill perf-pill\" onclick=\"togglePerfMode()\" title=\"Reduce visual effects and start mobile in flat mode\">${t('dashboard.visuals','VISUALS')} <span class=\"v\" id=\"perfStatus\">${lowPerfMode?t('dashboard.visualsLite','LITE'):t('dashboard.visualsFull','FULL')}</span></button>\n" +
"      <span class=\"meta-pill\">${t('dashboard.refresh','REFRESH')} <span class=\"v\">30s</span></span>\n" +
"      <span class=\"meta-pill\">${d} <span class=\"v\">${timeStr}</span></span>\n" +
"      <span class=\"meta-pill\">${t('dashboard.feeds','FEEDS')} <span class=\"v\">6/7</span></span>\n" +
"      ${D.delta?.summary ? \\`<span class=\"meta-pill\">${t('dashboard.delta','DELTA')} <span class=\"v\">${D.delta.summary.direction==='risk-off'?'&#x25B2; '+t('dashboard.riskOff','RISK-OFF'):D.delta.summary.direction==='risk-on'?'&#x25BC; '+t('dashboard.riskOn','RISK-ON'):'&#x25C6; '+t('dashboard.mixed','MIXED')}</span></span>\\` : ''}\n" +
"      <button class=\"guide-btn\" onclick=\"openGlossary()\">${t('dashboard.guideBtn','SIGNAL LEGEND')}</button>\n" +
"      <span class=\"alert-badge\" style=\"background: ${alertState.color}20; border-color: ${alertState.color}; color: ${alertState.color};\">${alertState.text.replace('● ', '')}</span>\n" +
"    </div>`;\n" +
"  renderRegionControls();\n" +
"}";

content = content.replace(renderTopbarRegex, newRenderTopbar);

// Fix colors
const colorRegex = /--border:rgba\(100,240,200,0\.[13]{2}\);--border-bright:rgba\(100,240,200,0\.[30]{1,2}\);[\s\S]*?--sans:'Space Grotesk',sans-serif;/;
content = content.replace(colorRegex, 
  "--border:rgba(0,229,200,0.12);--border-bright:rgba(0,229,200,0.3);\n  --text:#e8f4f0;--dim:#6a8a82;--accent:#00E5C8;--accent2:#A8C7FA;\n  --warn:#F5A623;--danger:#FF3D3D;--safe:#1FD177;--mono:'IBM Plex Mono',monospace;--sans:'Space Grotesk',sans-serif;");

// Undo misapplied Intelligence rules
content = content.replace(/Geospatial Prediction Data/gi, "Geospatial Intelligence");
content = content.replace(/Disaster prediction data Platform/gi, "DISASTER INTELLIGENCE PLATFORM");
content = content.replace(/DISASTER PREDICTION DATA PLATFORM/gi, "DISASTER INTELLIGENCE PLATFORM");
content = content.replace(/GEONIX — Geospatial Disaster Prediction Data/gi, "GEONIX — Geospatial Disaster Intelligence");
content = content.replace(/GEONIX — Prediction Data Terminal/gi, "GEONIX — Geospatial Disaster Intelligence");

// Fix initial html <title> and meta
const titleRegex = /<title>GEONIX — Prediction Data Terminal<\/title>/;
content = content.replace(titleRegex, "<title>GEONIX — Geospatial Disaster Intelligence</title>\n<meta name=\"description\" content=\"AI-powered disaster prediction platform for floods and wildfires\" />");

const titleRegex2 = /<title>CRUCIX — Intelligence Terminal<\/title>/;
content = content.replace(titleRegex2, "<title>GEONIX — Geospatial Disaster Intelligence</title>\n<meta name=\"description\" content=\"AI-powered disaster prediction platform for floods and wildfires\" />");


fs.writeFileSync(filePath, content, 'utf-8');
console.log('Update finished.');
