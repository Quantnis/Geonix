import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import OperationsPage from './pages/OperationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TopBar from './components/TopBar';
import { usePageNavigation } from './hooks/usePageNavigation';

// Invisible Keyboard Listener Wrapper
const KeyboardListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  usePageNavigation();
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      {/* Root Setup for React Router, applying the global Geonix Design system manually */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', height: '100vh',
        background: 'var(--gx-bg-void, #101512)', color: 'var(--gx-text-primary, #D4D9D0)', overflow: 'hidden'
      }}>
        <TopBar />
        <KeyboardListener>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/operations" replace />} />
              <Route path="/operations" element={<OperationsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Routes>
          </div>
        </KeyboardListener>
      </div>
    </BrowserRouter>
  );
}
