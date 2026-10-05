// Centralized theme palette + helper utilities
// Usage: import { colors, get } from './themeTokens.js';

export const colors = {
  light: {
    bgCanvas: '#e2e8f0',          // slate-200
    bgSoft:   'rgba(203,213,225,0.94)', // slate-300/200 overlay
    panel:    'rgba(226,232,240,0.98)', // slate-100 overlay
    panelSoft:'rgba(148,163,184,0.18)', // slate-400/300 translucent

    border:   'rgba(71,85,105,0.24)',  // slate-600/500
    text:     '#0f172a',               // slate-900
    textSoft: '#475569',               // slate-600

    accentCyan:  '#06b6d4',
    accentViolet:'#7c3aed',
    accentEmerald:'#10b981',
    accentAmber: '#d97706',
  },
  dark: {
    bgCanvas: '#030a14',
    bgSoft:   'rgba(3,10,20,0.92)',
    panel:    'rgba(8,18,32,0.97)',
    panelSoft:'rgba(255,255,255,0.04)',

    border:   'rgba(255,255,255,0.07)',
    text:     '#f1f5f9', // slate-100
    textSoft: '#64748b', // slate-500

    accentCyan:  '#06b6d4',
    accentViolet:'#7c3aed',
    accentEmerald:'#10b981',
    accentAmber: '#ffb020',
  },
};

export const get = (mode, key) => colors[mode === 'light' ? 'light' : 'dark'][key];
