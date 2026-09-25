import { ScrollView, View } from 'react-native';

import { AppButton, AppText, Card, Screen, ThemeModeSelector } from '@/components/ui';
import { useLocalData } from '@/data';
import { createThemedStyles, useAppTheme } from '@/theme';

const FOUNDATIONS = [
  'Versioned SQLite migrations with integrity checks',
  'Anonymous app-scoped guest identity',
  'Typed word, category, review, and settings repositories',
  'Cloud-ready ownership and sync metadata',
] as const;

export default function FoundationScreen() {
  const styles = useStyles();
  const { resolvedMode, setMode } = useAppTheme();
  const { categoryCount, databaseVersion, identity, wordCount } = useLocalData();

  return (
    <Screen edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <AppText style={styles.eyebrow} variant="caption">
            VOCABULARY VAULT
          </AppText>
          <AppText variant="display">Words worth keeping.</AppText>
          <AppText tone="secondary">
            Capture the language you discover, then turn it into knowledge that stays with you.
          </AppText>
        </View>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <AppText variant="subtitle">Local vault ready</AppText>
              <AppText tone="secondary">Guest data stays on this device until you link an account.</AppText>
            </View>
            <View style={styles.readyBadge}>
              <AppText style={styles.readyBadgeText} variant="caption">
                READY
              </AppText>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <AppText variant="title">{wordCount}</AppText>
              <AppText tone="tertiary" variant="caption">
                WORDS
              </AppText>
            </View>
            <View style={styles.stat}>
              <AppText variant="title">{categoryCount}</AppText>
              <AppText tone="tertiary" variant="caption">
                CATEGORIES
              </AppText>
            </View>
            <View style={styles.stat}>
              <AppText variant="title">v{databaseVersion}</AppText>
              <AppText tone="tertiary" variant="caption">
                SCHEMA
              </AppText>
            </View>
          </View>

          <View style={styles.identityRow}>
            <AppText tone="tertiary" variant="caption">
              GUEST ID
            </AppText>
            <AppText variant="label">{identity.localUserId.slice(0, 8)}…</AppText>
          </View>
          <View style={styles.identityRow}>
            <AppText tone="tertiary" variant="caption">
              DEVICE ID
            </AppText>
            <AppText variant="label">{identity.deviceId.slice(0, 8)}…</AppText>
          </View>
        </Card>

        <Card style={styles.section}>
          <AppText variant="subtitle">Appearance</AppText>
          <AppText tone="secondary">
            The app currently resolves to {resolvedMode} mode. Choose a preference to review both
            palettes.
          </AppText>
          <ThemeModeSelector />
          <AppButton
            label={`Preview ${resolvedMode === 'dark' ? 'light' : 'dark'} mode`}
            onPress={() => setMode(resolvedMode === 'dark' ? 'light' : 'dark')}
          />
        </Card>

        <Card style={styles.section}>
          <AppText variant="subtitle">Stage 2 data foundation</AppText>
          <View style={styles.list}>
            {FOUNDATIONS.map((foundation) => (
              <View key={foundation} style={styles.listItem}>
                <View style={styles.checkmark} />
                <AppText style={styles.listText}>{foundation}</AppText>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.statusRow}>
          <View style={[styles.status, styles.learning]}>
            <AppText style={styles.learningText} variant="caption">
              Learning
            </AppText>
          </View>
          <View style={[styles.status, styles.familiar]}>
            <AppText style={styles.familiarText} variant="caption">
              Familiar
            </AppText>
          </View>
          <View style={[styles.status, styles.mastered]}>
            <AppText style={styles.masteredText} variant="caption">
              Mastered
            </AppText>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = createThemedStyles((theme) => ({
  content: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  hero: {
    gap: theme.spacing.sm,
    maxWidth: 640,
  },
  eyebrow: {
    color: theme.colors.brand.primary,
    letterSpacing: 1.6,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  sectionHeaderText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  readyBadge: {
    backgroundColor: theme.colors.semantic.success.background,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  readyBadgeText: {
    color: theme.colors.semantic.success.foreground,
    letterSpacing: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  stat: {
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.md,
    flex: 1,
    gap: theme.spacing.xxs,
    padding: theme.spacing.md,
  },
  identityRow: {
    alignItems: 'center',
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
  },
  list: {
    gap: theme.spacing.sm,
  },
  listItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  checkmark: {
    backgroundColor: theme.colors.semantic.success.foreground,
    borderRadius: theme.radius.pill,
    height: 8,
    marginRight: theme.spacing.sm,
    width: 8,
  },
  listText: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  status: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  learning: {
    backgroundColor: theme.colors.learningStatus.learning.background,
  },
  learningText: {
    color: theme.colors.learningStatus.learning.foreground,
  },
  familiar: {
    backgroundColor: theme.colors.learningStatus.familiar.background,
  },
  familiarText: {
    color: theme.colors.learningStatus.familiar.foreground,
  },
  mastered: {
    backgroundColor: theme.colors.learningStatus.mastered.background,
  },
  masteredText: {
    color: theme.colors.learningStatus.mastered.foreground,
  },
}));
