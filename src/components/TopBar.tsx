import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOperations = location.pathname === '/operations' || location.pathname === '/';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 18px',
      borderBottom: '1px solid var(--gx-border)',
      background: 'var(--gx-bg-panel)',
      backdropFilter: 'blur(20px)',
      position: 'relative'
    }}>
      {/* BRAND & LEFT SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: '15px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--gx-text-primary)'
        }}>GEONIX</span>
      </div>

      {/* CENTER — NAVIGATION TABS */}
      <nav style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '2px',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '6px',
        padding: '3px',
      }}>
        {[
          { id: 'operations', label: 'OPERATIONS', path: '/operations' },
          { id: 'analytics',  label: 'ANALYTICS',  path: '/analytics' },
        ].map(tab => {
          const isActive = location.pathname.startsWith(tab.path) || (tab.id === 'operations' && location.pathname === '/');
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.14em',
                padding: '5px 16px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                background: isActive 
                  ? 'var(--gx-accent-primary)' 
                  : 'transparent',
                color: isActive 
                  ? '#101512' 
                  : 'var(--gx-text-secondary)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* RIGHT CONTROLS & PAGE INDICATOR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          fontFamily: 'var(--font-data)',
          fontSize: '9px',
          color: 'var(--gx-text-tertiary)',
          letterSpacing: '0.1em',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ 
            width: '6px', height: '6px', borderRadius: '50%',
            background: isOperations ? 'var(--gx-accent-primary)' : 'var(--gx-text-tertiary)'
          }}/>
          <span style={{ 
            width: '6px', height: '6px', borderRadius: '50%',
            background: !isOperations ? 'var(--gx-accent-primary)' : 'var(--gx-text-tertiary)'
          }}/>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
