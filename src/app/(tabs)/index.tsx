import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppButton, AppText, Card, PageHeader, Screen } from '@/components/ui';
import { useLocalData } from '@/data';
import { showGoogleSignInNotice } from '@/features/auth/google-sign-in-notice';
import { createThemedStyles, useAppTheme } from '@/theme';

export default function HomeScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { categoryCount, wordCount } = useLocalData();

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          description="Collect words you want to remember and make them part of your vocabulary."
          eyebrow="Vocabulary Vault"
          title="Your words, remembered."
        />

        <Card style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons color={theme.colors.brand.onPrimary} name="auto-stories" size={28} />
          </View>
          <View style={styles.heroCopy}>
            <AppText style={styles.heroTitle} variant="subtitle">
              Start your personal dictionary
            </AppText>
            <AppText style={styles.heroDescription}>
              Add the first word you want to keep, define, and review.
            </AppText>
          </View>
          <AppButton
            label="Add your first word"
            onPress={() => router.push('/(tabs)/add')}
            variant="secondary"
          />
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <AppText variant="title">{wordCount}</AppText>
            <AppText tone="secondary" variant="caption">
              SAVED WORDS
            </AppText>
          </Card>
          <Card style={styles.statCard}>
            <AppText variant="title">{categoryCount}</AppText>
            <AppText tone="secondary" variant="caption">
              CATEGORIES
            </AppText>
          </Card>
        </View>

        <Card style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <MaterialIcons color={theme.colors.brand.primary} name="cloud-done" size={24} />
          </View>
          <View style={styles.accountCopy}>
            <AppText variant="label">Your vault is local</AppText>
            <AppText tone="secondary" variant="caption">
              Sign in later to back up and sync your words across devices.
            </AppText>
          </View>
          <AppButton label="Learn more" onPress={showGoogleSignInNotice} variant="ghost" />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const useStyles = createThemedStyles((theme) => ({
  content: {
    gap: theme.spacing.lg,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    width: '100%',
  },
  heroCard: {
    backgroundColor: theme.colors.brand.primary,
    gap: theme.spacing.md,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: theme.isDark ? '#FFFFFF1A' : '#FFFFFF24',
    borderRadius: theme.radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  heroCopy: {
    gap: theme.spacing.xs,
  },
  heroTitle: {
    color: theme.colors.brand.onPrimary,
  },
  heroDescription: {
    color: theme.colors.brand.onPrimary,
    opacity: 0.84,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  accountCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  accountIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  accountCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
}));
