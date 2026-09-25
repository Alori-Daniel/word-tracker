import { ThemeProvider as NavigationThemeProvider } from 'expo-router';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  createNavigationTheme,
  darkTheme,
  lightTheme,
  type AppTheme,
  type ResolvedThemeMode,
  type ThemeMode,
} from './themes';

type AppThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

type AppThemeProviderProps = PropsWithChildren<{
  initialMode?: ThemeMode;
  onModeChange?: (mode: ThemeMode) => Promise<void> | void;
}>;

export function AppThemeProvider({
  children,
  initialMode = 'system',
  onModeChange,
}: AppThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setStoredMode] = useState<ThemeMode>(initialMode);

  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      setStoredMode(nextMode);

      if (onModeChange) {
        void Promise.resolve(onModeChange(nextMode)).catch((error: unknown) => {
          console.error('Unable to persist the theme preference.', error);
        });
      }
    },
    [onModeChange],
  );

  const resolvedMode: ResolvedThemeMode =
    mode === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : mode;
  const theme = resolvedMode === 'dark' ? darkTheme : lightTheme;

  const value = useMemo<AppThemeContextValue>(
    () => ({ mode, resolvedMode, setMode, theme }),
    [mode, resolvedMode, setMode, theme],
  );
  const navigationTheme = useMemo(() => createNavigationTheme(theme), [theme]);

  return (
    <AppThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeContextValue {
  const value = useContext(AppThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used within AppThemeProvider.');
  }

  return value;
}
