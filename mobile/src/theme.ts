const PALETTE = {
  light: {
    primary: '#2563eb',
    bg: '#ffffff',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    danger: '#ef4444',
    success: '#16a34a',
    warning: '#f59e0b',
    border: '#e2e8f0',
    statusBar: 'dark' as const,
  },
  dark: {
    primary: '#e2e8f0',
    bg: '#0f172a',
    card: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    danger: '#f87171',
    success: '#4ade80',
    warning: '#fbbf24',
    border: '#334155',
    statusBar: 'light' as const,
  },
} as const;

export const theme = PALETTE.light;

export const NAV_THEME = {
  light: {
    background: 'hsl(0 0% 100%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    card: 'hsl(0 0% 100%)',
    notification: 'hsl(0 84.2% 60.2%)',
    primary: 'hsl(221.2 83.2% 53.3%)',
    text: 'hsl(222.2 84% 4.9%)',
  },
  dark: {
    background: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(217.2 32.6% 17.5%)',
    card: 'hsl(222.2 84% 4.9%)',
    notification: 'hsl(0 62.8% 30.6%)',
    primary: 'hsl(210 40% 98%)',
    text: 'hsl(210 40% 98%)',
  },
};

export const isWeb = false;

export const useIsWeb = () => isWeb;
