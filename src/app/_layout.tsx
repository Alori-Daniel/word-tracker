import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocalDataProvider, useLocalData } from '@/data';
import { AiAssistProvider } from '@/features/ai';
import { AccountProvider, useAccount } from '@/features/auth';
import { DictionaryLookupProvider } from '@/features/dictionary';
import { ReviewProvider } from '@/features/review';
import { VocabularyProvider } from '@/features/vocabulary';
import { WidgetSyncProvider } from '@/features/widgets';
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
  const { getAccessToken } = useAccount();

  return (
    <AppThemeProvider initialMode={settings.themeMode} onModeChange={setThemeMode}>
      <DictionaryLookupProvider>
        <AiAssistProvider getAccessToken={getAccessToken}>
          <VocabularyProvider>
            <WidgetSyncProvider>
              <ReviewProvider>
                <RootNavigator />
              </ReviewProvider>
            </WidgetSyncProvider>
          </VocabularyProvider>
        </AiAssistProvider>
      </DictionaryLookupProvider>
    </AppThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocalDataProvider>
        <AccountProvider>
          <ThemedApplication />
        </AccountProvider>
      </LocalDataProvider>
    </SafeAreaProvider>
  );
}
