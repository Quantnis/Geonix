import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const usePageNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && location.pathname === '/operations') {
        navigate('/analytics');
      }
      if (e.key === 'ArrowLeft' && location.pathname === '/analytics') {
        navigate('/operations');
      }
      // Also: digit keys
      if (e.key === '1') navigate('/operations');
      if (e.key === '2') navigate('/analytics');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [location.pathname, navigate]);
};
