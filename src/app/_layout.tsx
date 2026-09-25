import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocalDataProvider, useLocalData } from '@/data';
import { ReviewProvider } from '@/features/review';
import { VocabularyProvider } from '@/features/vocabulary';
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
  const { settings, setThemeMode } = useLocalData();

  return (
    <AppThemeProvider initialMode={settings.themeMode} onModeChange={setThemeMode}>
      <VocabularyProvider>
        <ReviewProvider>
          <RootNavigator />
        </ReviewProvider>
      </VocabularyProvider>
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
