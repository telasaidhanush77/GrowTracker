import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { darkColors, lightColors } from '../theme';

export type ColorPalette = typeof darkColors;

interface ThemeContextValue {
  colors: ColorPalette;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);
  const toggleTheme = useCallback(() => setIsDark(d => !d), []);
  const value = useMemo(() => ({ colors, isDark, toggleTheme }), [colors, isDark, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
