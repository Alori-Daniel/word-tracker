import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocalDataProvider, useLocalData } from '@/data';
import type { ThemeMode } from '@/domain/settings';
import { AppThemeProvider, useAppTheme } from '@/theme';

function RootNavigator() {
  const { theme } = useAppTheme();

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background.canvas },
          headerShown: false,
        }}
      />
    </>
  );
}

function ThemedApplication() {
  const { repositories, settings } = useLocalData();
  const persistThemeMode = useCallback(
    (mode: ThemeMode) => repositories.settings.setThemeMode(mode),
    [repositories],
  );

  return (
    <AppThemeProvider initialMode={settings.themeMode} onModeChange={persistThemeMode}>
      <RootNavigator />
    </AppThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocalDataProvider>
        <ThemedApplication />
      </LocalDataProvider>
    </SafeAreaProvider>
  );
}
