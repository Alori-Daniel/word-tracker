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
import { GoogleSignInButton, useAccount } from '@/features/auth';
import { useSubscription } from '@/features/subscriptions';
import { useVocabulary } from '@/features/vocabulary';
import { WidgetSettingsCard } from '@/features/widgets';
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
  const {
    account,
    errorMessage: accountError,
    isConfigured: isAccountConfigured,
    signOut,
    syncNow,
    syncState,
  } = useAccount();
  const { subscription } = useSubscription();
  const { categories, wordCount } = useVocabulary();
  const [isReplayingWelcome, setIsReplayingWelcome] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
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
                <AppText variant="label">
                  {account?.displayName ?? account?.email ?? 'Guest profile'}
                </AppText>
                <AppText tone="secondary" variant="caption">
                  {account
                    ? account.email
                    : 'Your words stay private on this device.'}
                </AppText>
              </View>
              <View style={styles.localBadge}>
                <AppText style={styles.localBadgeText} variant="caption">
                  {subscription.isPremium
                    ? subscription.isTrial
                      ? 'TRIAL'
                      : 'PREMIUM'
                    : account
                      ? 'FREE'
                      : 'LOCAL'}
                </AppText>
              </View>
            </View>

            {account ? (
              <>
                <View style={styles.syncSummary}>
                  <View style={styles.dataRow}>
                    <AppText tone="secondary">Cloud backup</AppText>
                    <AppText variant="label">
                      {syncState.status === 'syncing' ? 'Syncing…' : 'Connected'}
                    </AppText>
                  </View>
                  <View style={styles.dataRow}>
                    <AppText tone="secondary">Last synced</AppText>
                    <AppText variant="label">
                      {formatSyncTime(syncState.lastSyncedAt)}
                    </AppText>
                  </View>
                </View>
                {syncState.message ? (
                  <AppText
                    accessibilityRole={syncState.status === 'error' ? 'alert' : undefined}
                    style={syncState.status === 'error' ? styles.errorText : undefined}
                    tone={syncState.status === 'error' ? 'primary' : 'secondary'}
                    variant="caption"
                  >
                    {syncState.message}
                  </AppText>
                ) : null}
                <AppButton
                  label="Sync now"
                  loading={syncState.status === 'syncing'}
                  onPress={() => void syncNow().catch(() => undefined)}
                  variant="secondary"
                />
                <AppButton
                  label="Sign out"
                  loading={isSigningOut}
                  onPress={() => void handleSignOut()}
                  variant="ghost"
                />
              </>
            ) : (
              <>
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
                <GoogleSignInButton variant="primary" />
                {!isAccountConfigured ? (
                  <AppText tone="tertiary" variant="caption">
                    Google sign-in needs Supabase configuration for this build.
                  </AppText>
                ) : null}
              </>
            )}

            {accountError ? (
              <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
                {accountError}
              </AppText>
            ) : null}
          </Card>
        </View>

        <View style={styles.section}>
          <AppText variant="subtitle">Premium</AppText>
          <Card style={styles.card}>
            <View style={styles.premiumHeading}>
              <View style={styles.premiumIcon}>
                <MaterialIcons
                  color={theme.colors.brand.primary}
                  name="workspace-premium"
                  size={26}
                />
              </View>
              <View style={styles.accountCopy}>
                <AppText variant="label">
                  {subscription.isPremium
                    ? subscription.isTrial
                      ? 'Premium trial'
                      : 'WordEcho Premium'
                    : 'Unlock more from your vault'}
                </AppText>
                <AppText tone="secondary" variant="caption">
                  {subscription.isPremium
                    ? 'Manage your plan, renewal, and store subscription.'
                    : 'Unlimited imports, advanced widgets, analytics, and cloud history.'}
                </AppText>
              </View>
            </View>
            <AppButton
              label={subscription.isPremium ? 'Manage Premium' : 'Explore Premium'}
              onPress={() => router.push('/subscription')}
              variant={subscription.isPremium ? 'secondary' : 'primary'}
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
          <AppText variant="subtitle">Home Screen widget</AppText>
          <WidgetSettingsCard />
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
  premiumHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  premiumIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
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
  syncSummary: {
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.semantic.error.foreground,
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

function formatSyncTime(value: string | null): string {
  if (!value) return 'Not yet';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
