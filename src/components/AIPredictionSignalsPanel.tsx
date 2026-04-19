import React from 'react';
import { EcoAIPredictionCard } from '../../dashboard/components/EcoAIPredictionCard';

interface AIPredictionSignalsPanelProps {
  maxCards?: number;      // default: all. On Page 1: 2
  startFromCard?: number; // default: 0. On Page 2: 2 (show cards 3,4)
}

const AIPredictionSignalsPanel: React.FC<AIPredictionSignalsPanelProps> = ({ maxCards, startFromCard = 0 }) => {
  // Enhanced mock data for the AI prediction signals using EcoAIPredictionCard props
  const allCards: React.ComponentProps<typeof EcoAIPredictionCard>[] = [
    {
      title: 'Wildfire Expansion Prediction',
      disasterType: 'WILDFIRE',
      severity: 'CRITICAL',
      timeframe: '18H',
      confidence: 94,
      summary: [
        'Fuel Moisture: 8.2% | CRITICAL',
        'Wind Forecast: 45mph (NE) | DANGER',
        'Rel. Humidity: 8% | DANGER',
        'NDVI Anomaly: -0.31 | IGNITION RISK'
      ],
      action: 'ACT: Pre-position fire resources; Activate 5km evacuation',
      metrics: [
        { label: 'Wind Speed', value: 45, threshold: 40, unit: 'mph', sparklineData: [15, 20, 30, 40, 45, 45] },
        { label: 'Humidity', value: 8, threshold: 10, unit: '%', sparklineData: [20, 15, 12, 10, 8, 8] },
        { label: 'Temp', value: 38, threshold: 35, unit: '°C', sparklineData: [28, 30, 34, 36, 38, 38] }
      ]
    },
    {
      title: 'Flood Plain Saturation',
      disasterType: 'FLOOD',
      severity: 'WARNING',
      timeframe: '72H',
      confidence: 81,
      summary: [
        'Soil Saturation: 94% | WARNING',
        'Precip. Anomaly: +180% | SEVERE',
        'River Gauge: +0.3m/hr | RISING',
        'Reservoir Level: 97% | CRITICAL'
      ],
      action: 'ACT: Issue flood watch; Deploy monitoring drones',
      metrics: [
        { label: 'Saturation', value: 94, threshold: 90, unit: '%', sparklineData: [70, 80, 85, 90, 92, 94] },
        { label: 'River Rate', value: 0.3, threshold: 0.25, unit: 'm/hr', sparklineData: [0.1, 0.15, 0.2, 0.25, 0.28, 0.3] },
        { label: 'Precip.', value: 180, threshold: 150, unit: '%', sparklineData: [50, 100, 120, 150, 170, 180] }
      ]
    }
  ];

  const endIndex = maxCards ? startFromCard + maxCards : allCards.length;
  const visibleCards = allCards.slice(startFromCard, endIndex);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {visibleCards.map((card, idx) => (
        <EcoAIPredictionCard key={idx} {...card} />
      ))}
    </div>
  );
};

export default AIPredictionSignalsPanel;
