import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { AppButton, AppText, Card, PageHeader, Screen } from '@/components/ui';
import { showGoogleSignInNotice } from '@/features/auth/google-sign-in-notice';
import { useReview } from '@/features/review';
import { useVocabulary, WordListItem } from '@/features/vocabulary';
import { createThemedStyles, useAppTheme } from '@/theme';

export default function HomeScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { dueCount } = useReview();
  const { categories, recentWords, wordCount } = useVocabulary();
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

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
              {wordCount === 0 ? 'Start your personal dictionary' : 'Keep building your vault'}
            </AppText>
            <AppText style={styles.heroDescription}>
              {wordCount === 0
                ? 'Add the first word you want to keep, define, and review.'
                : 'Capture another word while it is still fresh.'}
            </AppText>
          </View>
          <AppButton
            label={wordCount === 0 ? 'Add your first word' : 'Add another word'}
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
            <AppText variant="title">{categories.length}</AppText>
            <AppText tone="secondary" variant="caption">
              CATEGORIES
            </AppText>
          </Card>
        </View>

        {dueCount > 0 ? (
          <Card style={styles.reviewCard}>
            <View style={styles.reviewIcon}>
              <MaterialIcons color={theme.colors.brand.primary} name="school" size={24} />
            </View>
            <View style={styles.reviewCopy}>
              <AppText variant="label">
                {dueCount} {dueCount === 1 ? 'word is' : 'words are'} ready to review
              </AppText>
              <AppText tone="secondary" variant="caption">
                A short session will help make them stick.
              </AppText>
            </View>
            <AppButton
              label="Review"
              onPress={() => router.push('/(tabs)/review')}
              variant="ghost"
            />
          </Card>
        ) : null}

        {recentWords.length > 0 ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeading}>
              <AppText variant="subtitle">Recently added</AppText>
              <AppButton
                label="View all"
                onPress={() => router.push('/(tabs)/library')}
                variant="ghost"
              />
            </View>
            <View style={styles.recentList}>
              {recentWords.slice(0, 3).map((word) => (
                <WordListItem
                  category={word.categoryId ? categoryById.get(word.categoryId) : undefined}
                  key={word.id}
                  onPress={() =>
                    router.push({ pathname: '/word/[id]', params: { id: word.id } })
                  }
                  word={word}
                />
              ))}
            </View>
          </View>
        ) : null}

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
  recentSection: {
    gap: theme.spacing.sm,
  },
  reviewCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  reviewIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  reviewCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  recentHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentList: {
    gap: theme.spacing.sm,
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
