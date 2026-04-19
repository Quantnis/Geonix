import React, { useEffect, useState } from 'react';

interface EcoAIPredictionCardProps {
  disasterType: 'WILDFIRE' | 'FLOOD' | 'STORM' | 'DROUGHT' | 'WATCH';
  severity: 'CRITICAL' | 'WARNING' | 'WATCH';
  timeframe: string;          // "18H" | "72H"
  confidence: number;         // 0–100
  title: string;
  summary: string[];            // BULLET POINTS for clean scanning
  action: string;             // MAX 1 sentence. What to do.
  metrics: {
    label: string;            // e.g. "Fuel moisture", "Soil saturation"
    value: number;            // current value (0–100 normalized)
    threshold: number;        // danger threshold (0–100 normalized)
    unit: string;             // e.g. "%", "mm/hr", "°C"
    sparklineData: number[];  // 12 data points for sparkline
  }[];                        // exactly 3 metrics per card
}

const typeStyles: Record<string, { bg: string, border: string, text: string }> = {
  WILDFIRE: { bg: 'rgba(199,110,90,0.15)', border: '#C76E5A', text: '#C76E5A' },
  FLOOD:    { bg: 'rgba(214,160,85,0.15)', border: '#D6A055', text: '#D6A055' },
  WATCH:    { bg: 'rgba(77,124,107,0.15)', border: '#4D7C6B', text: '#4D7C6B' },
  DROUGHT:  { bg: 'rgba(107,90,77,0.15)', border: '#8B7355', text: '#8B7355' },
  STORM:    { bg: 'rgba(58,99,114,0.15)',   border: '#3A6372', text: '#3A6372' }, // Based on info color
};

const Sparkline: React.FC<{ data: number[]; color: string; threshold?: number }> = 
  ({ data, color, threshold }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const W = 80, H = 20;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * H;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      {threshold !== undefined && (
        <line
          x1="0" y1={H - ((threshold - min) / (max - min || 1)) * H}
          x2={W} y2={H - ((threshold - min) / (max - min || 1)) * H}
          stroke={color} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5"
        />
      )}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <circle
        cx={W}
        cy={H - ((data[data.length-1] - min) / (max - min || 1)) * H}
        r="2"
        fill={color}
      />
    </svg>
  );
};

export const EcoAIPredictionCard: React.FC<EcoAIPredictionCardProps> = ({
  disasterType,
  severity,
  timeframe,
  confidence,
  title,
  summary,
  action,
  metrics
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true) }, []);

  const style = typeStyles[disasterType] || typeStyles.WATCH;

  return (
    <div style={{
      background: 'var(--gx-bg-surface, #1A2118)',
      border: `1px solid var(--gx-border-card, rgba(212, 217, 208, 0.07))`,
      borderRadius: 'var(--gx-radius-md, 10px)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--gx-text-primary, #D4D9D0)'
    }}>
      {/* Top Header / Pill Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{
            background: style.bg,
            border: `1px solid ${style.border}`,
            color: style.text,
            fontFamily: 'var(--font-data, "JetBrains Mono", monospace)',
            fontSize: '9px',
            padding: '2px 6px',
            borderRadius: '4px',
            letterSpacing: '0.08em',
            fontWeight: 500
          }}>
            {disasterType}
          </div>
          <div style={{
            fontFamily: 'var(--font-data, "JetBrains Mono", monospace)',
            fontSize: '9px',
            color: 'var(--gx-text-tertiary, #4D5E50)'
          }}>
            {timeframe}
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-data, "JetBrains Mono", monospace)',
          fontSize: '9px',
          color: style.text
        }}>
          CONF: {confidence}%
        </div>
      </div>

      {/* Confidence Bar */}
      <div style={{
        height: '2px', background: 'var(--gx-bg-elevated, #212B1F)', borderRadius: '1px',
        marginBottom: '12px'
      }}>
        <div style={{
          height: '100%', width: mounted ? `${confidence}%` : '0%', borderRadius: '1px',
          background: style.border,
          transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)'
        }}/>
      </div>

      {/* Title & Summary */}
      <div style={{
        fontFamily: 'var(--font-display, "Syne", sans-serif)',
        fontSize: '13px',
        fontWeight: 500,
        marginBottom: '4px'
      }}>{title}</div>
      <ul style={{
        fontFamily: 'var(--font-display, "Syne", sans-serif)',
        fontSize: '11px',
        lineHeight: 1.6,
        color: 'var(--gx-text-secondary, #7A8C7D)',
        marginBottom: '16px',
        paddingLeft: '16px',
        margin: '0 0 16px 16px'
      }}>
        {summary.map((point, i) => (
          <li key={i} style={{ marginBottom: '4px' }}>{point}</li>
        ))}
      </ul>

      {/* Metric Rows */}
      <div style={{
        borderTop: '1px solid var(--gx-border, rgba(77, 124, 107, 0.15))',
        borderBottom: '1px solid var(--gx-border, rgba(77, 124, 107, 0.15))',
        padding: '12px 0',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {metrics.map((m, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              fontFamily: 'var(--font-display, "Syne", sans-serif)',
              fontSize: '11px',
              color: 'var(--gx-text-secondary, #7A8C7D)',
              flex: 1
            }}>{m.label}</div>
            
            <div style={{ margin: '0 16px' }}>
              <Sparkline data={m.sparklineData} color={style.text} threshold={m.threshold} />
            </div>

            <div style={{
              fontFamily: 'var(--font-data, "JetBrains Mono", monospace)',
              fontSize: '11px',
              color: 'var(--gx-text-mono, #9BB5A8)',
              width: '45px',
              textAlign: 'right'
            }}>
              {m.value}{m.unit}
            </div>
          </div>
        ))}
      </div>

      {/* Action Line */}
      <div style={{
        fontFamily: 'var(--font-display, "Syne", sans-serif)',
        fontSize: '11px',
        fontStyle: 'italic',
        color: 'var(--gx-text-secondary, #7A8C7D)'
      }}>
        {action}
      </div>
    </div>
  );
};
