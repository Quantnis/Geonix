import React, { useState, useEffect } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  pageKey: string;  // unique key per page, e.g. 'operations' or 'analytics'
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, pageKey }) => {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(timer);
  }, [pageKey]);
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(20px)',
        transition: 'opacity 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
