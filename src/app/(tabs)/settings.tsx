import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import {
  AppButton,
  AppText,
  Card,
  PageHeader,
  Screen,
  ThemeModeSelector,
} from '@/components/ui';
import { useLocalData } from '@/data';
import { showGoogleSignInNotice } from '@/features/auth/google-sign-in-notice';
import { useVocabulary } from '@/features/vocabulary';
import { createThemedStyles, useAppTheme } from '@/theme';

const ACCOUNT_BENEFITS = [
  'Back up your vocabulary',
  'Restore it on a new device',
  'Sync across devices',
] as const;

export default function SettingsScreen() {
  const styles = useStyles();
  const { resolvedMode, theme } = useAppTheme();
  const { databaseVersion, identity, setOnboardingCompleted } = useLocalData();
  const { categories, wordCount } = useVocabulary();
  const [isReplayingWelcome, setIsReplayingWelcome] = useState(false);

  async function replayWelcome() {
    setIsReplayingWelcome(true);

    try {
      await setOnboardingCompleted(false);
      router.replace('/(onboarding)/welcome');
    } catch {
      Alert.alert('Unable to open welcome', 'Please try again. Your local data has not changed.');
    } finally {
      setIsReplayingWelcome(false);
    }
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          description="Manage your account, appearance, and local vault."
          eyebrow="Make it yours"
          title="Settings"
        />

        <View style={styles.section}>
          <AppText variant="subtitle">Account</AppText>
          <Card style={styles.card}>
            <View style={styles.accountHeading}>
              <View style={styles.accountAvatar}>
                <MaterialIcons color={theme.colors.brand.primary} name="person" size={26} />
              </View>
              <View style={styles.accountCopy}>
                <AppText variant="label">Guest profile</AppText>
                <AppText tone="secondary" variant="caption">
                  Your words stay private on this device.
                </AppText>
              </View>
              <View style={styles.localBadge}>
                <AppText style={styles.localBadgeText} variant="caption">
                  LOCAL
                </AppText>
              </View>
            </View>

            <View style={styles.benefitList}>
              {ACCOUNT_BENEFITS.map((benefit) => (
                <View key={benefit} style={styles.benefitRow}>
                  <MaterialIcons
                    color={theme.colors.semantic.success.foreground}
                    name="check"
                    size={18}
                  />
                  <AppText style={styles.benefitText} tone="secondary">
                    {benefit}
                  </AppText>
                </View>
              ))}
            </View>

            <AppButton
              accessibilityLabel="Sign in with Google"
              label="Sign in with Google"
              leftAccessory={
                <View style={styles.googleMark}>
                  <AppText style={styles.googleMarkText} variant="label">
                    G
                  </AppText>
                </View>
              }
              onPress={showGoogleSignInNotice}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <AppText variant="subtitle">Appearance</AppText>
          <Card style={styles.card}>
            <View style={styles.settingCopy}>
              <AppText variant="label">Color mode</AppText>
              <AppText tone="secondary" variant="caption">
                Currently using {resolvedMode} colors.
              </AppText>
            </View>
            <ThemeModeSelector />
          </Card>
        </View>

        <View style={styles.section}>
          <AppText variant="subtitle">Local vault</AppText>
          <Card style={styles.card}>
            <View style={styles.dataRow}>
              <AppText tone="secondary">Saved words</AppText>
              <AppText variant="label">{wordCount}</AppText>
            </View>
            <View style={styles.dataRow}>
              <AppText tone="secondary">Categories</AppText>
              <AppText variant="label">{categories.length}</AppText>
            </View>
            <View style={styles.dataRow}>
              <AppText tone="secondary">Guest ID</AppText>
              <AppText variant="label">{identity.localUserId.slice(0, 8)}…</AppText>
            </View>
            <View style={styles.dataRow}>
              <AppText tone="secondary">Database</AppText>
              <AppText variant="label">Version {databaseVersion}</AppText>
            </View>
            <AppButton
              label="Manage categories"
              onPress={() => router.push('/categories')}
              variant="secondary"
            />
          </Card>
        </View>

        <AppButton
          label="View welcome screen"
          loading={isReplayingWelcome}
          onPress={() => void replayWelcome()}
          variant="ghost"
        />
      </ScrollView>
    </Screen>
  );
}

const useStyles = createThemedStyles((theme) => ({
  content: {
    gap: theme.spacing.xl,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    width: '100%',
  },
  section: {
    gap: theme.spacing.sm,
  },
  card: {
    gap: theme.spacing.lg,
  },
  accountHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  accountAvatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  accountCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  localBadge: {
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  localBadgeText: {
    color: theme.colors.content.secondary,
    letterSpacing: 0.7,
  },
  benefitList: {
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  benefitText: {
    flex: 1,
  },
  googleMark: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  googleMarkText: {
    color: '#4285F4',
    fontWeight: '700',
  },
  settingCopy: {
    gap: theme.spacing.xxs,
  },
  dataRow: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.sm,
  },
}));
