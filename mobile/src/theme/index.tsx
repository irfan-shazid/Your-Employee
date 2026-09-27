import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useAppSelector } from '@/store/hooks';
import { darkTheme, lightTheme, type Theme } from './tokens';

export * from './tokens';

const ThemeContext = createContext<Theme>(lightTheme);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const preference = useAppSelector((s) => s.ui.themePreference);
  const system = useColorScheme();
  const isDark = preference === 'dark' || (preference === 'system' && system === 'dark');
  return <ThemeContext.Provider value={isDark ? darkTheme : lightTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

