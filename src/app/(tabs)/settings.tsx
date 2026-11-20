import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from 'react-native';

import {
  AppButton,
  AppText,
  Screen,
} from '@/components/ui';
import { useLocalData } from '@/data';
import type { VocabularyWord } from '@/domain/vocabulary';
import { GoogleSignInButton, useAccount } from '@/features/auth';
import { useSubscription } from '@/features/subscriptions';
import { useVocabulary } from '@/features/vocabulary';
import { WidgetSettingsCard } from '@/features/widgets';
import { createVocabularyCsv, shareVocabularyCsv } from '@/services/export';
import {
  cancelDailyReviewReminder,
  ReviewReminderPermissionError,
  scheduleDailyReviewReminder,
} from '@/services/reminders';
import { subscriptionLegalLinks } from '@/services/subscriptions';
import { createThemedStyles, useAppTheme } from '@/theme';

const ACCOUNT_BENEFITS = [
  'Back up your vocabulary',
  'Restore it on a new device',
  'Sync across devices',
] as const;

export default function SettingsScreen() {
  const styles = useStyles();
  const { resolvedMode, setMode, theme } = useAppTheme();
  const {
    settings,
    setOnboardingCompleted,
    setReviewRemindersEnabled,
    setReviewReminderTime,
  } = useLocalData();
  const {
    account,
    errorMessage: accountError,
    isConfigured: isAccountConfigured,
    signOut,
    syncNow,
    syncState,
  } = useAccount();
  const { subscription } = useSubscription();
  const { categories, listWords, wordCount } = useVocabulary();
  const [isReplayingWelcome, setIsReplayingWelcome] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isReminderSaving, setIsReminderSaving] = useState(false);
  const [isReminderTimePickerVisible, setIsReminderTimePickerVisible] = useState(false);
  const [draftReminderTime, setDraftReminderTime] = useState(() =>
    reminderTimeToDate(settings.reviewReminderTime),
  );
  const [isExporting, setIsExporting] = useState(false);
  const { privacyUrl } = subscriptionLegalLinks();

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

  async function handleReminderToggle(enabled: boolean) {
    setIsReminderSaving(true);

    try {
      if (enabled) {
        await scheduleDailyReviewReminder(settings.reviewReminderTime);
        try {
          await setReviewRemindersEnabled(true);
        } catch (error) {
          await cancelDailyReviewReminder();
          throw error;
        }
      } else {
        await cancelDailyReviewReminder();
        try {
          await setReviewRemindersEnabled(false);
        } catch (error) {
          await scheduleDailyReviewReminder(settings.reviewReminderTime);
          throw error;
        }
      }
    } catch (error) {
      showReminderError(error);
    } finally {
      setIsReminderSaving(false);
    }
  }

  function openReminderTimePicker() {
    setDraftReminderTime(reminderTimeToDate(settings.reviewReminderTime));
    setIsReminderTimePickerVisible(true);
  }

  function handleReminderTimeChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setIsReminderTimePickerVisible(false);
    }
    if (event.type !== 'set' || !date) return;

    setDraftReminderTime(date);
    if (Platform.OS === 'android') {
      void saveReminderTime(date);
    }
  }

  async function saveReminderTime(date: Date) {
    const nextTime = dateToReminderTime(date);
    const previousTime = settings.reviewReminderTime;
    setIsReminderTimePickerVisible(false);
    if (nextTime === previousTime) return;

    setIsReminderSaving(true);
    try {
      if (settings.reviewRemindersEnabled) {
        await scheduleDailyReviewReminder(nextTime);
      }
      try {
        await setReviewReminderTime(nextTime);
      } catch (error) {
        if (settings.reviewRemindersEnabled) {
          await scheduleDailyReviewReminder(previousTime);
        }
        throw error;
      }
    } catch (error) {
      showReminderError(error);
    } finally {
      setIsReminderSaving(false);
    }
  }

  async function exportVocabulary() {
    if (wordCount === 0) {
      Alert.alert('Nothing to export', 'Add a word before creating a CSV export.');
      return;
    }

    setIsExporting(true);
    try {
      const words: VocabularyWord[] = [];
      const pageSize = 200;
      for (let offset = 0; ; offset += pageSize) {
        const page = await listWords({ limit: pageSize, offset });
        words.push(...page);
        if (page.length < pageSize) break;
      }
      await shareVocabularyCsv(createVocabularyCsv(words, categories));
    } catch {
      Alert.alert('Export unavailable', 'Your vocabulary could not be exported. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }

  async function openPrivacyPolicy() {
    if (!privacyUrl) {
      Alert.alert('Privacy policy unavailable', 'Add EXPO_PUBLIC_PRIVACY_URL to this build.');
      return;
    }
    try {
      await Linking.openURL(privacyUrl);
    } catch {
      Alert.alert('Privacy policy unavailable', 'The privacy policy could not be opened.');
    }
  }

  async function openSupport() {
    const supportEmail = publicSupportEmail();
    if (!supportEmail) {
      Alert.alert('Support unavailable', 'Add EXPO_PUBLIC_SUPPORT_EMAIL to this build.');
      return;
    }

    const url = `mailto:${supportEmail}?subject=${encodeURIComponent('WordEcho support')}`;
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // Fall through to display the address when no mail app is available.
    }

    Alert.alert('Contact support', supportEmail);
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeading}>
          <AppText tone="tertiary" variant="caption">WORDECHO</AppText>
          <AppText style={styles.pageTitle} variant="editorial">Make it yours</AppText>
          <AppText tone="secondary">Account, reminders, appearance, and your collection.</AppText>
        </View>

        <View style={styles.section}>
          <SectionTitle>Account</SectionTitle>
          <View style={styles.card}>
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
                <GoogleSignInButton />
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
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>Premium</SectionTitle>
          <View style={styles.card}>
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
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>Notifications</SectionTitle>
          <View style={styles.settingsList}>
            <SettingRow
              description="A gentle prompt to review your saved words."
              icon="notifications-none"
              title="Daily reminder"
              trailing={
                <Switch
                  accessibilityLabel="Daily reminder"
                  disabled={isReminderSaving}
                  ios_backgroundColor={theme.colors.background.muted}
                  onValueChange={(enabled) => void handleReminderToggle(enabled)}
                  thumbColor={theme.colors.background.elevated}
                  trackColor={{
                    false: theme.colors.border.default,
                    true: theme.colors.brand.primary,
                  }}
                  value={settings.reviewRemindersEnabled}
                />
              }
            />
            <SettingRow
              disabled={isReminderSaving}
              description={isReminderSaving ? 'Saving reminder…' : 'Uses your device’s local time.'}
              icon="schedule"
              onPress={openReminderTimePicker}
              title="Reminder time"
              trailing={
                <View style={styles.rowValue}>
                  <AppText tone="secondary" variant="label">
                    {formatReminderTime(settings.reviewReminderTime)}
                  </AppText>
                  <MaterialIcons
                    color={theme.colors.content.tertiary}
                    name="chevron-right"
                    size={22}
                  />
                </View>
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>App settings</SectionTitle>
          <View style={styles.settingsList}>
            <SettingRow
              description={`Currently using ${resolvedMode} colors.`}
              icon="dark-mode"
              title="Dark mode"
              trailing={
                <Switch
                  accessibilityLabel="Dark mode"
                  ios_backgroundColor={theme.colors.background.muted}
                  onValueChange={(enabled) => setMode(enabled ? 'dark' : 'light')}
                  thumbColor={theme.colors.background.elevated}
                  trackColor={{
                    false: theme.colors.border.default,
                    true: theme.colors.brand.primary,
                  }}
                  value={resolvedMode === 'dark'}
                />
              }
            />
            <SettingRow
              description="Add words from a structured CSV file."
              icon="upload-file"
              onPress={() => router.push('/import-words')}
              title="Import words"
            />
            <SettingRow
              disabled={isExporting}
              description={isExporting ? 'Preparing your CSV…' : `${wordCount} saved words`}
              icon="file-download"
              onPress={() => void exportVocabulary()}
              title="Export words"
            />
            <SettingRow
              icon="shield"
              onPress={() => void openPrivacyPolicy()}
              title="Privacy policy"
            />
            <SettingRow
              icon="help-outline"
              onPress={() => void openSupport()}
              title="Help & support"
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle>Home Screen widget</SectionTitle>
          <WidgetSettingsCard />
        </View>

        <View style={styles.section}>
          <SectionTitle>Local vault</SectionTitle>
          <View style={styles.card}>
            <View style={styles.dataRow}>
              <AppText tone="secondary">Saved words</AppText>
              <AppText variant="label">{wordCount}</AppText>
            </View>
            <View style={styles.dataRow}>
              <AppText tone="secondary">Categories</AppText>
              <AppText variant="label">{categories.length}</AppText>
            </View>
            <AppButton
              label="Manage categories"
              onPress={() => router.push('/categories')}
              variant="secondary"
            />
          </View>
        </View>

        <AppButton
          label="View welcome screen"
          loading={isReplayingWelcome}
          onPress={() => void replayWelcome()}
          variant="ghost"
        />
      </ScrollView>

      {Platform.OS === 'android' && isReminderTimePickerVisible ? (
        <DateTimePicker
          display="default"
          mode="time"
          onChange={handleReminderTimeChange}
          value={draftReminderTime}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setIsReminderTimePickerVisible(false)}
          transparent
          visible={isReminderTimePickerVisible}
        >
          <View style={styles.timePickerOverlay}>
            <Pressable
              accessibilityLabel="Close reminder time picker"
              accessibilityRole="button"
              onPress={() => setIsReminderTimePickerVisible(false)}
              style={styles.timePickerBackdrop}
            />
            <View style={styles.timePickerSheet}>
              <View style={styles.timePickerHeading}>
                <AppText variant="subtitle">Reminder time</AppText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void saveReminderTime(draftReminderTime)}
                >
                  <AppText style={styles.doneText} variant="label">Done</AppText>
                </Pressable>
              </View>
              <DateTimePicker
                display="spinner"
                mode="time"
                onChange={handleReminderTimeChange}
                themeVariant={resolvedMode}
                value={draftReminderTime}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </Screen>
  );
}

function SettingRow({
  description,
  disabled = false,
  icon,
  onPress,
  title,
  trailing,
}: {
  description?: string;
  disabled?: boolean;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
  title: string;
  trailing?: ReactNode;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const content = (
    <>
      <View style={styles.settingIcon}>
        <MaterialIcons color={theme.colors.brand.primary} name={icon} size={23} />
      </View>
      <View style={styles.settingRowCopy}>
        <AppText variant="label">{title}</AppText>
        {description ? (
          <AppText tone="secondary" variant="caption">{description}</AppText>
        ) : null}
      </View>
      {trailing ?? (onPress ? (
        <MaterialIcons color={theme.colors.content.tertiary} name="chevron-right" size={22} />
      ) : null)}
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        pressed && styles.settingRowPressed,
        disabled && styles.settingRowDisabled,
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.settingRow}>{content}</View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const styles = useStyles();
  return <AppText style={styles.sectionTitle} variant="caption">{children.toUpperCase()}</AppText>;
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
  pageHeading: {
    gap: theme.spacing.sm,
  },
  pageTitle: {
    fontSize: 38,
    lineHeight: 44,
  },
  sectionTitle: {
    color: theme.colors.content.tertiary,
    letterSpacing: 1.1,
    paddingLeft: theme.spacing.xs,
  },
  card: {
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xs,
    paddingTop: theme.spacing.lg,
  },
  accountHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  accountAvatar: {
    alignItems: 'center',
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
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  localBadge: {
    borderBottomColor: theme.colors.border.default,
    borderBottomWidth: 1,
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
  settingsList: {
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
  },
  settingRow: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 76,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  settingRowPressed: {
    opacity: 0.68,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingIcon: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  settingRowCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  rowValue: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xxs,
  },
  timePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  timePickerBackdrop: {
    backgroundColor: theme.colors.overlay.scrim,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  timePickerSheet: {
    backgroundColor: theme.colors.background.elevated,
    borderTopColor: theme.colors.border.default,
    borderTopWidth: 1,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  timePickerHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  doneText: {
    color: theme.colors.brand.primary,
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

function reminderTimeToDate(time: string): Date {
  const [hour = 8, minute = 0] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function dateToReminderTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatReminderTime(time: string): string {
  return reminderTimeToDate(time).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function publicSupportEmail(): string | null {
  const value = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

function showReminderError(error: unknown) {
  if (error instanceof ReviewReminderPermissionError) {
    Alert.alert(
      'Notifications are off',
      'Allow notifications in your device settings to use daily reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: () => void Linking.openSettings() },
      ],
    );
    return;
  }

  Alert.alert('Reminder unavailable', 'The reminder could not be updated. Please try again.');
}
