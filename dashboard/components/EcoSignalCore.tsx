import React from 'react';

interface EcoSignalCoreProps {
  metrics: {
    id: string;
    label: string;         // e.g. "Fire weather index"
    value: number;         // e.g. 38.2
    unit: string;
    history: number[];     // 48 data points (48 hours)
    trend: 'up' | 'down' | 'stable';
    severity: 'critical' | 'warning' | 'normal';
  }[];
}

const colorMap = {
  critical: 'var(--gx-accent-danger, #C76E5A)',
  warning: 'var(--gx-accent-warning, #D6A055)',
  normal: 'var(--gx-accent-safe, #5A8F72)'
};

const getTrendColor = (severity: 'critical' | 'warning' | 'normal', trend: 'up' | 'down' | 'stable') => {
  if (severity === 'critical' && trend === 'up') return colorMap.critical;
  if (severity === 'warning' && trend === 'up') return colorMap.warning;
  return colorMap.normal;
};

const EcoSparkline: React.FC<{ 
  history: number[]; 
  color: string;
  filled?: boolean;
}> = ({ history, color, filled }) => {
  const W = 120, H = 28;
  const max = Math.max(...history) * 1.1;
  const min = 0; // Or Math.min(...history) depending on need, prompt says min = 0
  const pts = history.map((v, i) => ({
    x: (i / (history.length - 1)) * W,
    y: H - ((v - min) / (max - min || 1)) * (H - 2)
  }));
  
  const linePath = `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`;
  
  return (
    <svg width={W} height={H} style={{ overflow: 'hidden' }}>
      {filled && (
        <path d={areaPath} fill={color} opacity="0.08"/>
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.2"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export const EcoSignalCore: React.FC<EcoSignalCoreProps> = ({ metrics }) => {
  return (
    <div style={{
      background: 'var(--gx-bg-panel, #141A16)',
      border: '1px solid var(--gx-border, rgba(77, 124, 107, 0.15))',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {metrics.map((metric, idx) => {
        const tColor = getTrendColor(metric.severity, metric.trend);
        
        return (
          <div key={metric.id} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderBottom: idx < metrics.length - 1 ? '1px solid var(--gx-border, rgba(77, 124, 107, 0.15))' : 'none'
          }}>
            {/* Label */}
            <div style={{
              fontFamily: 'var(--font-display, "Syne", sans-serif)',
              fontSize: '11px',
              color: 'var(--gx-text-secondary, #7A8C7D)',
              flex: 1,
              textTransform: 'none' // Enforce sentence case
            }}>
              {metric.label}
            </div>

            {/* Value & Trend */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginRight: '24px'
            }}>
              <span style={{
                fontFamily: 'var(--font-data, "JetBrains Mono", monospace)',
                fontSize: '15px',
                color: 'var(--gx-text-mono, #9BB5A8)'
              }}>
                {metric.value.toLocaleString()}
              </span>
              <span style={{
                fontSize: '12px',
                color: tColor
              }}>
                {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
              </span>
            </div>

            {/* Sparkline */}
            <div>
              <EcoSparkline 
                history={metric.history} 
                color={tColor} 
                filled={true} 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
