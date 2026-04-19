import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import AIPredictionSignalsPanel from '../components/AIPredictionSignalsPanel';

// Mock components for Operations Page
const DisasterMonitorPanel = () => <div style={{padding:'10px'}}>Disaster Monitor</div>;
const EnvWatchPanel = () => <div style={{padding:'10px'}}>Env Watch</div>;
const SatelliteWatchPanel = () => <div style={{padding:'10px'}}>Satellite Watch</div>;
const MapCore = () => <div style={{width:'100%', height:'100%', background:'var(--gx-bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Map Core</div>;
const SignalCorePanel = () => <div style={{padding:'10px'}}>Signal Core</div>;

// ViewAllAnalyticsLink
const ViewAllAnalyticsLink: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate('/analytics')}
      style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--gx-border)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-data)',
        fontSize: '10px',
        color: 'var(--gx-text-secondary)',
        letterSpacing: '0.08em',
        transition: 'color 150ms ease',
        marginTop: 'auto',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--gx-accent-primary)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--gx-text-secondary)')}
    >
      <span>FULL ANALYTICS</span>
      <span style={{ fontSize: '14px' }}>→</span>
    </div>
  );
};

const OperationsPage: React.FC = () => {
  return (
    <PageTransition pageKey="operations">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr 360px',
        gridTemplateRows: '1fr',
        height: '100%',
        gap: '0',
        overflow: 'hidden',
      }}>
        
        {/* LEFT SIDEBAR */}
        <aside style={{
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(12px)',
          overflow: 'hidden',
        }}>
          <DisasterMonitorPanel />    {/* Wildfire Events, Flood Watch etc. */}
          <EnvWatchPanel />           {/* Regional sensors, 6 regions */}
          <SatelliteWatchPanel />     {/* Sentinel-2, Planet Labs, GOES */}
        </aside>
        
        {/* CENTER — MAP (takes all available space) */}
        <main style={{ position: 'relative', overflow: 'hidden' }}>
          <MapCore />                 {/* Full interactive globe */}
          {/* Legend row is part of MapCore, shown at bottom */}
        </main>
        
        {/* RIGHT SIDEBAR — AI Intelligence only */}
        <aside style={{
          display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(12px)',
          overflow: 'hidden',
        }}>
          {/* Show ONLY TOP 2 most critical AI prediction cards */}
          <AIPredictionSignalsPanel maxCards={2} />
          
          {/* Signal Core with sparklines */}
          <SignalCorePanel />
          
          {/* Small "view all analytics →" link at bottom */}
          <ViewAllAnalyticsLink />
        </aside>
        
      </div>
    </PageTransition>
  );
};

export default OperationsPage;
