import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LocalDataProvider, useLocalData } from '@/data';
import { AccountProvider } from '@/features/auth';
import { DictionaryLookupProvider } from '@/features/dictionary';
import { ReviewProvider } from '@/features/review';
import { SubscriptionProvider } from '@/features/subscriptions';
import { VocabularyProvider } from '@/features/vocabulary';
import { WidgetSyncProvider } from '@/features/widgets';
import {
  configureReviewReminderPresentation,
  isReviewReminderResponse,
} from '@/services/reminders';
import { AppThemeProvider, useAppTheme } from '@/theme';

configureReviewReminderPresentation();

function RootNavigator() {
  const { theme } = useAppTheme();

  useEffect(() => {
    function openReview(response: Notifications.NotificationResponse | null) {
      if (!isReviewReminderResponse(response)) return;
      router.push('/(tabs)/review');
      Notifications.clearLastNotificationResponse();
    }

    openReview(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(openReview);
    return () => subscription.remove();
  }, []);

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
      <DictionaryLookupProvider>
        <VocabularyProvider>
          <WidgetSyncProvider>
            <ReviewProvider>
              <RootNavigator />
            </ReviewProvider>
          </WidgetSyncProvider>
        </VocabularyProvider>
      </DictionaryLookupProvider>
    </AppThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocalDataProvider>
        <AccountProvider>
          <SubscriptionProvider>
            <ThemedApplication />
          </SubscriptionProvider>
        </AccountProvider>
      </LocalDataProvider>
    </SafeAreaProvider>
  );
}
