import React from 'react';

interface EcoTimelineEvent {
  id: string;
  hour: number;  // 0 to 72
  type: string;
  severity: 'critical' | 'warning' | 'normal';
  intensity: number; // 0 to 100, determines circle radius
  label?: string;
}

interface EcoTimelineRiverProps {
  width?: number;
  height?: number;
  events?: EcoTimelineEvent[];
}

const generateRiverPath = (width: number, height: number): string => {
  const mid = height / 2;
  const amplitude = 6; // how much the river meanders
  return `M 0 ${mid} 
    C ${width * 0.2} ${mid - amplitude}, 
      ${width * 0.4} ${mid + amplitude}, 
      ${width * 0.5} ${mid}
    S ${width * 0.8} ${mid - amplitude}, 
      ${width} ${mid}`;
};

// Calculates Y-coordinate on the bezier curve for placing markers
const getRiverY = (t: number, height: number): number => {
  const mid = height / 2;
  const A = 6;
  
  if (t <= 0.5) {
    const tLocal = t * 2; // Scale 0-0.5 to 0-1
    const mt = 1 - tLocal;
    // Cubic bezier Y with P0=0, P1=-A, P2=A, P3=0
    return mid + (3 * mt * mt * tLocal * (-A)) + (3 * mt * tLocal * tLocal * A);
  } else {
    const tLocal = (t - 0.5) * 2; // Scale 0.5-1.0 to 0-1
    const mt = 1 - tLocal;
    // Reflection of P2 across P3 is -A.
    // The second cubic curve has P0=0, P1=-A, P2=-A, P3=0
    return mid + (3 * mt * mt * tLocal * (-A)) + (3 * mt * tLocal * tLocal * (-A));
  }
};

const colorMap = {
  critical: 'var(--gx-accent-danger, #C76E5A)',
  warning: 'var(--gx-accent-warning, #D6A055)',
  normal: 'var(--gx-accent-safe, #5A8F72)'
};

const mockEvents: EcoTimelineEvent[] = [
  { id: '1', hour: 12, type: 'clear', severity: 'normal', intensity: 20 },
  { id: '2', hour: 36, type: 'wind', severity: 'warning', intensity: 50, label: 'GUSTS 45KMH' },
  { id: '3', hour: 58, type: 'fire', severity: 'critical', intensity: 85, label: 'IGNITION RISK' },
];

export const EcoTimelineRiver: React.FC<EcoTimelineRiverProps> = ({ 
  width = 800, 
  height = 80, 
  events = mockEvents 
}) => {
  const riverPath = generateRiverPath(width, height);

  return (
    <div style={{
      width,
      height,
      position: 'relative',
      background: 'var(--gx-bg-panel, #141A16)',
      border: '1px solid var(--gx-border, rgba(77, 124, 107, 0.15))',
      borderRadius: 'var(--gx-radius-md, 10px)',
      padding: '10px 0',
      overflow: 'hidden'
    }}>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="var(--gx-accent-safe, #5A8F72)"/>
            <stop offset="33%"  stopColor="var(--gx-accent-safe, #5A8F72)"/>
            <stop offset="60%"  stopColor="var(--gx-accent-warning, #D6A055)"/>
            <stop offset="100%" stopColor="var(--gx-accent-danger, #C76E5A)"/>
          </linearGradient>
        </defs>

        {/* River Path */}
        <path 
          d={riverPath} 
          fill="none" 
          stroke="url(#riverGrad)" 
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Hour markers (0h, 24h, 48h, 72h) overlaying the river */}
        {[0, 24, 48, 72].map(hour => {
          const t = hour / 72;
          const x = t * width;
          const isEdge = hour === 0 || hour === 72;
          return (
            <g key={`marker-${hour}`} opacity={0.4}>
              <line 
                x1={x} y1={0} 
                x2={x} y2={height} 
                stroke="var(--gx-border-strong, rgba(77, 124, 107, 0.30))" 
                strokeWidth="1" 
                strokeDasharray="2 4" 
              />
              {!isEdge && (
                <text 
                  x={x + 4} y={12} 
                  fill="var(--gx-text-tertiary, #4D5E50)"
                  fontFamily="var(--font-data, 'JetBrains Mono', monospace)"
                  fontSize="9px"
                >
                  +{hour}H
                </text>
              )}
            </g>
          );
        })}

        {/* Risk Event Markers */}
        {events.map(ev => {
          const t = ev.hour / 72;
          const x = t * width;
          const y = getRiverY(t, height);
          const r = 3 + (ev.intensity / 100) * 8; // Scale radius 3 to 11
          const color = colorMap[ev.severity];

          return (
            <g key={ev.id} transform={`translate(${x}, ${y})`}>
              <circle 
                cx={0} 
                cy={0} 
                r={r + 4} 
                fill={color} 
                opacity="0.15" 
              />
              <circle 
                cx={0} 
                cy={0} 
                r={r} 
                fill={color} 
                stroke="var(--gx-bg-panel, #141A16)"
                strokeWidth="1.5"
              />
              {ev.label && (
                <text
                  x={0}
                  y={-r - 6}
                  textAnchor="middle"
                  fill="var(--gx-text-primary, #D4D9D0)"
                  fontFamily="var(--font-display, 'Syne', sans-serif)"
                  fontSize="9px"
                  fontWeight="600"
                  letterSpacing="0.05em"
                >
                  {ev.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
