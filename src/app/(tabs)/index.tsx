import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, AppText, Screen } from '@/components/ui';
import type { WordAdditionStreak } from '@/domain/word-addition-streak';
import { useReview } from '@/features/review';
import { useVocabulary, WordListItem } from '@/features/vocabulary';
import { createThemedStyles, useAppTheme } from '@/theme';

const STREAK_OVERLAY_ENTERING = FadeIn.duration(100);
const STREAK_OVERLAY_EXITING = FadeOut.duration(140);
const STREAK_NOTIFICATION_ENTERING = FadeInUp.duration(220);
const STREAK_NOTIFICATION_EXITING = FadeOutUp.duration(160);

export default function HomeScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { dueCount, reviewedToday } = useReview();
  const { categories, recentWords, updateWord, wordAdditionStreak, wordCount } = useVocabulary();
  const [isStreakOpen, setIsStreakOpen] = useState(false);
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
            <Pressable
              accessibilityLabel={`Open ${wordAdditionStreak.current}-day word streak`}
              accessibilityRole="button"
              accessibilityState={{ expanded: isStreakOpen }}
              onPress={() => setIsStreakOpen((value) => !value)}
              style={({ pressed }) => [
                styles.progressPill,
                isStreakOpen && styles.progressPillActive,
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons color={theme.colors.brand.primary} name="local-fire-department" size={17} />
              <AppText variant="caption">
                {wordAdditionStreak.current} {wordAdditionStreak.current === 1 ? 'day' : 'days'}
              </AppText>
            </Pressable>
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

      {isStreakOpen ? (
        <StreakNotification
          onClose={() => setIsStreakOpen(false)}
          streak={wordAdditionStreak}
        />
      ) : null}
    </Screen>
  );
}

function StreakNotification({
  onClose,
  streak,
}: {
  onClose: () => void;
  streak: WordAdditionStreak;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      accessibilityViewIsModal
      entering={STREAK_OVERLAY_ENTERING}
      exiting={STREAK_OVERLAY_EXITING}
      style={styles.streakOverlay}
    >
      <Pressable
        accessibilityLabel="Close streak details"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.streakBackdrop}
      />
      <Animated.View
        entering={STREAK_NOTIFICATION_ENTERING}
        exiting={STREAK_NOTIFICATION_EXITING}
        style={[
          styles.streakNotificationPosition,
          { top: insets.top + theme.spacing.xs },
        ]}
      >
        <View style={styles.streakNotification}>
          <View style={styles.streakNotificationHeader}>
            <View style={styles.streakTitleCopy}>
              <AppText style={styles.streakTitle} variant="editorial">
                {streak.current === 0
                  ? 'Your word streak starts today'
                  : `Day ${streak.current} of your word streak`}
              </AppText>
              <AppText tone="secondary" variant="caption">
                {streak.addedToday
                  ? 'Today is complete. Keep showing up.'
                  : 'Add a new word today to light up the day.'}
              </AppText>
            </View>
            <Pressable
              accessibilityLabel="Close streak details"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.streakClose, pressed && styles.pressed]}
            >
              <MaterialIcons color={theme.colors.content.secondary} name="close" size={20} />
            </Pressable>
          </View>

          <View style={styles.streakDetails}>
            <View style={styles.flameCounter}>
              <MaterialIcons
                color={streak.current > 0
                  ? theme.colors.brand.primary
                  : theme.colors.content.tertiary}
                name="local-fire-department"
                size={54}
              />
              <AppText
                style={[styles.flameNumber, streak.current === 0 && styles.flameNumberInactive]}
                variant="label"
              >
                {streak.current}
              </AppText>
            </View>

            <View style={styles.notificationDays}>
              {streak.lastSevenDays.map((isActive, index) => {
                const isToday = index === 6;
                return (
                  <View key={index} style={styles.notificationDay}>
                    <AppText
                      style={isToday ? styles.todayLabel : undefined}
                      tone={isToday ? 'primary' : 'tertiary'}
                      variant="caption"
                    >
                      {relativeWeekday(index)}
                    </AppText>
                    <View
                      style={[
                        styles.notificationDot,
                        isToday && styles.notificationDotToday,
                        isActive && styles.notificationDotActive,
                      ]}
                    >
                      {isActive ? (
                        <MaterialIcons
                          color={theme.colors.brand.onPrimary}
                          name="check"
                          size={14}
                        />
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
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
  progressPillActive: {
    backgroundColor: theme.colors.brand.soft,
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
    borderBottomColor: theme.colors.border.subtle,
    borderBottomWidth: 1,
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
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
  streakOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  streakBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  streakNotificationPosition: {
    alignItems: 'center',
    left: 0,
    paddingHorizontal: theme.spacing.sm,
    position: 'absolute',
    right: 0,
  },
  streakNotification: {
    backgroundColor: theme.colors.background.elevated,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    elevation: 14,
    gap: theme.spacing.lg,
    maxWidth: 540,
    padding: theme.spacing.md,
    shadowColor: theme.colors.overlay.shadow,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    width: '100%',
  },
  streakNotificationHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  streakTitleCopy: { flex: 1, gap: theme.spacing.xxs },
  streakTitle: { fontSize: 23, lineHeight: 29 },
  streakClose: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  streakDetails: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  flameCounter: {
    alignItems: 'center',
    height: 58,
    justifyContent: 'center',
    width: 52,
  },
  flameNumber: {
    bottom: 8,
    color: theme.colors.brand.onPrimary,
    position: 'absolute',
  },
  flameNumberInactive: { color: theme.colors.content.primary },
  notificationDays: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationDay: { alignItems: 'center', gap: theme.spacing.xs },
  todayLabel: { fontWeight: '700' },
  notificationDot: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.muted,
    borderColor: 'transparent',
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  notificationDotToday: { borderColor: theme.colors.brand.primary },
  notificationDotActive: {
    backgroundColor: theme.colors.brand.primary,
    borderColor: theme.colors.brand.primary,
  },
  recentSection: { gap: theme.spacing.md },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: theme.colors.brand.primary },
  recentList: { gap: theme.spacing.sm },
  pressed: { opacity: 0.62 },
}));

function relativeWeekday(index: number): string {
  const date = new Date();
  date.setDate(date.getDate() + index - 6);
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date).slice(0, 2);
}
