import React from 'react';

export const EcoIcons = {
  forest: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L3 7h2L3 11h3v2h2v-2h3L9 7h2L7 1z" 
            fill="var(--gx-accent-safe)" opacity="0.8"/>
    </svg>
  ),
  water: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1C7 1 3 6 3 9a4 4 0 008 0C11 6 7 1 7 1z" 
            fill="var(--gx-accent-info)" opacity="0.8"/>
    </svg>
  ),
  soil: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="var(--gx-accent-warning)" 
              strokeWidth="1.5" fill="none"/>
      <circle cx="7" cy="7" r="2" fill="var(--gx-accent-warning)" opacity="0.6"/>
    </svg>
  ),
  air: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 5h7c1.5 0 2.5-1 2.5-2S10.5 1 9 1" 
            stroke="var(--gx-accent-primary)" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M2 8h9c1.5 0 2.5 1 2.5 2S12.5 12 11 12" 
            stroke="var(--gx-accent-primary)" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  biodiversity: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 14c-3.1 0-5-2.7-5-5 0-3 3-5 5-8 2 3 5 5 5 8 0 2.3-1.9 5-5 5z" 
            stroke="var(--gx-accent-primary-l, #6B9E8C)" strokeWidth="1.2" fill="none" opacity="0.8"/>
      <circle cx="7" cy="8" r="1.5" fill="var(--gx-accent-primary-l, #6B9E8C)"/>
    </svg>
  )
};
