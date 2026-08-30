import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Palette, dark, light } from '../theme';
import { useStore } from './store';

interface ThemeValue {
  palette: Palette;
  reduceMotion: boolean;
}

const ThemeContext = createContext<ThemeValue>({ palette: light, reduceMotion: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const { state } = useStore();
  const reduceMotion = useReducedMotion();
  const mode = state.settings.themeMode;
  const resolved = mode === 'system' ? (system ?? 'light') : mode;
  const value = useMemo(
    () => ({ palette: resolved === 'dark' ? dark : light, reduceMotion }),
    [resolved, reduceMotion],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
