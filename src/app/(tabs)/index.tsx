import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { AppButton, AppText, Screen } from '@/components/ui';
import { useReview } from '@/features/review';
import { useVocabulary, WordListItem } from '@/features/vocabulary';
import { createThemedStyles, useAppTheme } from '@/theme';

export default function HomeScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { dueCount, reviewedToday } = useReview();
  const { categories, recentWords, updateWord, wordCount } = useVocabulary();
  const featuredWord = recentWords[0];
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  async function toggleFavourite() {
    if (!featuredWord) return;

    try {
      await updateWord(featuredWord.id, { isFavorite: !featuredWord.isFavorite });
    } catch {
      Alert.alert('Could not update favourite', 'Please try again.');
    }
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <AppText style={styles.brand} variant="caption">WORDECHO</AppText>
            <AppText tone="secondary" variant="caption">Your personal vocabulary</AppText>
          </View>
          <View style={styles.topActions}>
            <View style={styles.progressPill}>
              <MaterialIcons color={theme.colors.brand.primary} name="local-fire-department" size={17} />
              <AppText variant="caption">{reviewedToday} today</AppText>
            </View>
            <Pressable
              accessibilityLabel="Open settings"
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/settings')}
              style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
            >
              <MaterialIcons color={theme.colors.content.primary} name="person-outline" size={23} />
            </Pressable>
          </View>
        </View>

        {featuredWord ? (
          <View style={styles.featured}>
            <AppText tone="tertiary" variant="caption">LATEST WORD</AppText>
            <View style={styles.wordBlock}>
              <AppText adjustsFontSizeToFit numberOfLines={1} style={styles.word} variant="editorial">
                {featuredWord.word}
              </AppText>
              {featuredWord.pronunciation ? (
                <View style={styles.pronunciationPill}>
                  <AppText tone="secondary" variant="caption">{featuredWord.pronunciation}</AppText>
                </View>
              ) : null}
              <AppText style={styles.definition}>
                {featuredWord.simpleDefinition || featuredWord.definition}
              </AppText>
            </View>

            <View style={styles.wordActions}>
              <RoundAction
                icon="info-outline"
                label="Details"
                onPress={() =>
                  router.push({ pathname: '/word/[id]', params: { id: featuredWord.id } })
                }
              />
              <RoundAction
                icon={featuredWord.isFavorite ? 'favorite' : 'favorite-border'}
                label={featuredWord.isFavorite ? 'Favourited' : 'Favourite'}
                onPress={() => void toggleFavourite()}
                selected={featuredWord.isFavorite}
              />
              <RoundAction
                icon="edit"
                label="Edit"
                onPress={() =>
                  router.push({ pathname: '/word/[id]/edit', params: { id: featuredWord.id } })
                }
              />
            </View>
          </View>
        ) : (
          <View style={styles.emptyHero}>
            <View style={styles.emptyIcon}>
              <MaterialIcons color={theme.colors.brand.primary} name="auto-stories" size={36} />
            </View>
            <AppText style={styles.emptyTitle} variant="editorial">Your next word begins here.</AppText>
            <AppText style={styles.emptyDescription} tone="secondary">
              Save a word while it is fresh. WordEcho will keep it ready for review.
            </AppText>
            <AppButton label="Add your first word" onPress={() => router.push('/(tabs)/add')} />
          </View>
        )}

        <View style={styles.practiceCard}>
          <View style={styles.practiceCopy}>
            <AppText variant="subtitle">
              {dueCount > 0 ? `${dueCount} ready to review` : 'Practice complete'}
            </AppText>
            <AppText tone="secondary" variant="caption">
              {dueCount > 0
                ? 'A quick session will help these words stick.'
                : `${reviewedToday} ${reviewedToday === 1 ? 'word' : 'words'} reviewed today.`}
            </AppText>
          </View>
          <Pressable
            accessibilityLabel="Open review"
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/review')}
            style={({ pressed }) => [styles.practiceButton, pressed && styles.pressed]}
          >
            <MaterialIcons color={theme.colors.brand.onPrimary} name="school" size={21} />
          </Pressable>
        </View>

        {recentWords.length > 1 ? (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeading}>
              <View>
                <AppText variant="subtitle">Your collection</AppText>
                <AppText tone="tertiary" variant="caption">{wordCount} SAVED WORDS</AppText>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/library')}>
                <AppText style={styles.link} variant="label">See all</AppText>
              </Pressable>
            </View>
            <View style={styles.recentList}>
              {recentWords.slice(1, 4).map((word) => (
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
      </ScrollView>
    </Screen>
  );
}

function RoundAction({
  icon,
  label,
  onPress,
  selected = false,
}: {
  icon: 'edit' | 'favorite' | 'favorite-border' | 'info-outline';
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <View style={[styles.wordActionButton, selected && styles.wordActionSelected]}>
        <MaterialIcons
          color={selected ? theme.colors.brand.primary : theme.colors.content.primary}
          name={icon}
          size={24}
        />
      </View>
    </Pressable>
  );
}

const useStyles = createThemedStyles((theme) => ({
  content: {
    gap: theme.spacing.lg,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    width: '100%',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    color: theme.colors.brand.primary,
    letterSpacing: 1.7,
  },
  topActions: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  progressPill: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    minHeight: 42,
    paddingHorizontal: theme.spacing.md,
  },
  circleButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  featured: {
    alignItems: 'center',
    gap: theme.spacing.xl,
    justifyContent: 'center',
    minHeight: 390,
    paddingVertical: theme.spacing.xl,
  },
  wordBlock: { alignItems: 'center', gap: theme.spacing.md, width: '100%' },
  word: { color: theme.colors.content.primary, fontSize: 46, lineHeight: 54, textAlign: 'center' },
  pronunciationPill: {
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  definition: { fontSize: 18, lineHeight: 28, maxWidth: 520, textAlign: 'center' },
  wordActions: { flexDirection: 'row', gap: theme.spacing.xl },
  wordActionButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  wordActionSelected: { backgroundColor: theme.colors.brand.soft },
  emptyHero: {
    alignItems: 'center',
    gap: theme.spacing.lg,
    justifyContent: 'center',
    minHeight: 390,
    paddingHorizontal: theme.spacing.md,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.xl,
    height: 82,
    justifyContent: 'center',
    width: 82,
  },
  emptyTitle: { fontSize: 37, lineHeight: 45, textAlign: 'center' },
  emptyDescription: { maxWidth: 440, textAlign: 'center' },
  practiceCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.xl,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  practiceCopy: { flex: 1, gap: theme.spacing.xxs },
  practiceButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  recentSection: { gap: theme.spacing.md },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: theme.colors.brand.primary },
  recentList: { gap: theme.spacing.sm },
  pressed: { opacity: 0.62 },
}));
