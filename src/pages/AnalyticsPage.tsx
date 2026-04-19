import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import AIPredictionSignalsPanel from '../components/AIPredictionSignalsPanel';

// Mock components GEONIX PAGE 2: moved from OperationsPage
const RiskGaugesPanel = () => <div style={{padding:'16px'}}>Risk Gauges (Moved)</div>;
const EcoSystemSuccesses = () => <div style={{padding:'16px'}}>Eco System Successes</div>;
const SensorStreamMiniPanel = () => <div style={{padding:'16px'}}>Sensor Stream</div>;

// New Analytical Panels for Screen 2
const DroneFleetTelemetry = () => <div className="glass-panel" style={{padding:'16px', height:'100%', border:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.02)', backdropFilter:'blur(12px)', borderRadius: '14px'}}>Drone Fleet Telemetry</div>;
const EcoSystemHealthHistory = () => <div className="glass-panel" style={{padding:'16px', height:'100%', border:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.02)', backdropFilter:'blur(12px)', borderRadius: '14px'}}>Eco-System Health History</div>;
const ImpactAnalysis = () => <div className="glass-panel" style={{padding:'16px', height:'100%', border:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.02)', backdropFilter:'blur(12px)', borderRadius: '14px'}}>Impact Analysis</div>;

const CrossSourceSignalsPanel = () => <div style={{padding:'16px'}}>Cross Source Signals</div>;
const EcoTimelineRiver = () => <div style={{padding:'16px'}}>Eco Timeline River</div>;

const MiniMapThumbnail: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{
      height: '80px',
      background: 'rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      cursor: 'pointer',
    }}
    onClick={() => navigate('/operations')}
    title="Return to map view"
    >
      <div style={{
        fontFamily: 'var(--font-data)', fontSize: '10px',
        color: 'var(--gx-accent-primary)', letterSpacing: '0.08em',
      }}>
        ← RETURN TO MAP VIEW
      </div>
    </div>
  )
};

const AnalyticsPage: React.FC = () => {
  return (
    <PageTransition pageKey="analytics">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr 320px',
        gridTemplateRows: '1fr',
        height: '100%',
        gap: '0',
        overflow: 'hidden',
      }}>
        
        {/* LEFT SIDEBAR — secondary monitoring */}
        <aside style={{
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(12px)',
          overflow: 'auto',
        }}>
          {/* GEONIX PAGE 2: moved from OperationsPage */}
          <MiniMapThumbnail />
          <RiskGaugesPanel />         {/* Fire Weather Idx, Flood Severity etc. */}
          <EcoSystemSuccesses />      {/* NEW: Restored hectares, clean water */}
          <SensorStreamMiniPanel />   {/* Compact raw sensor feed */}
        </aside>
        
        <main style={{
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          padding: '24px'
        }}>
          <div className="page-label" style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            color: 'var(--gx-text-tertiary)',
            letterSpacing: '0.15em',
            marginBottom: '24px'
          }}>
            ANALYTICS DEEP DIVE — historical data, impact analysis, eco recovery
          </div>
          
          {/* New 3-Column Grid Layout for Analytics Dashboard */}
          <section style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            overflow: 'hidden'
          }}>
            <DroneFleetTelemetry />
            <EcoSystemHealthHistory />
            <ImpactAnalysis />
          </section>
        </main>
        
        {/* RIGHT SIDEBAR — deep intelligence */}
        <aside style={{
          display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(12px)',
          overflow: 'hidden',
        }}>
          {/* Cross-Source Signals — all 6 */}
          <CrossSourceSignalsPanel />
          
          {/* AI Prediction cards 3 and 4 (Storm + Drought) */}
          <AIPredictionSignalsPanel startFromCard={2} maxCards={2} />
          
          {/* Eco Timeline River — 72h forecast */}
          <EcoTimelineRiver />
        </aside>
        
      </div>
    </PageTransition>
  );
};

export default AnalyticsPage;
