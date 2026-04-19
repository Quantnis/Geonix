import React, { useState, useEffect } from 'react';
import { EcoIcons } from './eco/EcoIcons';

interface EcoSystemSuccessesProps {
  metrics?: {
    label: string;
    value: number;
    unit: string;
    trend: 'recovering' | 'stable' | 'improving';
    icon: 'forest' | 'water' | 'soil' | 'air' | 'biodiversity';
  }[];
}

const mockSuccesses = [
  { label: 'Hectares restored',  value: 12400, unit: 'ha',   trend: 'recovering', icon: 'forest' },
  { label: 'Clean water access', value: 94.2,  unit: '% pop',trend: 'improving',  icon: 'water' },
  { label: 'Carbon sequestered', value: 847,   unit: 'kt',   trend: 'stable',     icon: 'soil' },
  { label: 'Air quality index',  value: 42,    unit: 'AQI',  trend: 'improving',  icon: 'air' },
] as const;

const useCountUp = (target: number, duration = 1200) => {
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    let animationFrameId: number;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(target * eased); // keep decimal precision, we'll format later
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration]);
  
  return value;
};

export const EcoSystemSuccesses: React.FC<EcoSystemSuccessesProps> = ({ metrics = mockSuccesses }) => {
  return (
    <div style={{
      background: 'var(--gx-bg-panel, #141A16)',
      border: '1px solid var(--gx-border, rgba(77, 124, 107, 0.15))',
      padding: '16px',
      color: 'var(--gx-text-primary, #D4D9D0)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{
          fontFamily: 'var(--font-display, "Syne", sans-serif)',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--gx-accent-safe, #5A8F72)'
        }}>ECO RECOVERY</div>
        <div style={{
          fontFamily: 'var(--font-data, "JetBrains Mono", monospace)',
          fontSize: '9px',
          color: 'var(--gx-accent-safe, #5A8F72)',
          background: 'rgba(90, 143, 114, 0.1)',
          border: '1px solid var(--gx-accent-safe, #5A8F72)',
          borderRadius: '4px',
          padding: '2px 5px'
        }}>THIS MONTH &uarr;</div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {metrics.map((metric, idx) => {
          const AnimatedValue = () => {
            const val = useCountUp(metric.value);
            // Format intelligently: if target is integer, round it. Otherwise 1 decimal for 94.2.
            const displayVal = Number.isInteger(metric.value) 
              ? Math.round(val).toLocaleString() 
              : val.toFixed(1);
            return <>{displayVal}</>;
          };
          
          const Icon = EcoIcons[metric.icon];

          return (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              borderBottom: idx < metrics.length - 1 ? '1px solid var(--gx-border, rgba(77, 124, 107, 0.15))' : 'none',
              paddingBottom: idx < metrics.length - 1 ? '12px' : '0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon />
                <span style={{
                  fontFamily: 'var(--font-display, "Syne", sans-serif)',
                  fontSize: '11px',
                  color: 'var(--gx-text-secondary, #7A8C7D)'
                }}>{metric.label}</span>
              </div>
              <div style={{
                fontFamily: 'var(--font-data, "JetBrains Mono", monospace)',
                fontSize: '16px',
                paddingLeft: '22px', // Align with text after icon
                color: 'var(--gx-text-primary, #D4D9D0)'
              }}>
                <AnimatedValue /> <span style={{ fontSize: '10px', color: 'var(--gx-text-tertiary, #4D5E50)' }}>{metric.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
