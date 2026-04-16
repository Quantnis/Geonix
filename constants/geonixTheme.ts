// constants/geonixTheme.ts
export const GEONIX_COLORS = {
  bgVoid:      '#080B0F',
  bgPanel:     '#0D1117',
  bgSurface:   '#141B24',
  bgElevated:  '#1C2733',
  accentPrimary: '#00E5C8',
  accentDanger:  '#FF3D3D',
  accentWarning: '#F5A623',
  accentSafe:    '#1FD177',
  textPrimary:   '#E8EDF2',
  textSecondary: '#6B7A8D',
  textMono:      '#A8C7FA',
  border:        'rgba(0, 229, 200, 0.12)',
} as const;

export const GEONIX_FONTS = {
  display: "'Space Grotesk', sans-serif",
  data:    "'JetBrains Mono', monospace",
} as const;

export const GEONIX_STRINGS = {
  brandName:    'GEONIX',
  tagline:      'DISASTER INTELLIGENCE PLATFORM',
  refreshLabel: 'REFRESH',
  feedsLabel:   'FEEDS',
} as const;
