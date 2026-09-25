import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { AppButton, AppText, Card, EmptyState, PageHeader, Screen } from '@/components/ui';
import type { ReviewResponse, VocabularyReviewHistoryItem } from '@/domain/vocabulary';
import { useReview } from '@/features/review';
import { useVocabulary } from '@/features/vocabulary';
import { createThemedStyles, useAppTheme } from '@/theme';

export default function ReviewScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { categories, wordCount } = useVocabulary();
  const {
    dueCount,
    dueWords,
    error,
    hasLoaded,
    isLoading,
    isSubmitting,
    recentReviews,
    refresh,
    resetSession,
    reviewedThisSession,
    reviewedToday,
    submitReview,
  } = useReview();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionTarget, setSessionTarget] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const currentWord = dueWords[0];
  const currentCategory = useMemo(
    () => categories.find((category) => category.id === currentWord?.categoryId),
    [categories, currentWord?.categoryId],
  );

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        void refresh();
      }, 0);

      return () => clearTimeout(timer);
    }, [refresh]),
  );

  function startSession() {
    resetSession();
    setSessionTarget(dueCount);
    setIsRevealed(false);
    setActionError(null);
    setIsSessionActive(true);
  }

  async function respond(response: ReviewResponse) {
    if (!currentWord) {
      return;
    }

    setActionError(null);

    try {
      await submitReview(currentWord, response);
      setIsRevealed(false);
    } catch {
      setActionError('Your response could not be saved. Please try again.');
    }
  }

  const refreshControl = (
    <RefreshControl
      onRefresh={() => void refresh()}
      refreshing={isLoading && hasLoaded}
      tintColor={theme.colors.brand.primary}
    />
  );

  if (!hasLoaded) {
    return (
      <Screen edges={['top', 'right', 'left']} style={styles.centered}>
        <ActivityIndicator color={theme.colors.brand.primary} size="large" />
      </Screen>
    );
  }

  if (isSessionActive) {
    return (
      <Screen edges={['top', 'right', 'left']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sessionHeader}>
            <View style={styles.sessionHeadingCopy}>
              <AppText tone="tertiary" variant="caption">
                REVIEW SESSION
              </AppText>
              <AppText variant="subtitle">
                {Math.min(reviewedThisSession + (currentWord ? 1 : 0), sessionTarget)} of{' '}
                {sessionTarget}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsSessionActive(false)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <AppText style={styles.endSessionText} variant="label">
                End session
              </AppText>
            </Pressable>
          </View>
          <ProgressBar
            progress={sessionTarget === 0 ? 1 : reviewedThisSession / sessionTarget}
          />

          {currentWord ? (
            <Card style={styles.reviewCard}>
              <View style={styles.wordHeading}>
                <View style={styles.wordCopy}>
                  <AppText style={styles.reviewWord} variant="display">
                    {currentWord.word}
                  </AppText>
                  {currentWord.pronunciation ? (
                    <AppText tone="secondary">{currentWord.pronunciation}</AppText>
                  ) : null}
                </View>
                {currentCategory ? (
                  <View style={styles.categoryPill}>
                    <View
                      style={[styles.categoryDot, { backgroundColor: currentCategory.color }]}
                    />
                    <AppText tone="secondary" variant="caption">
                      {currentCategory.name}
                    </AppText>
                  </View>
                ) : null}
              </View>

              {!isRevealed ? (
                <View style={styles.revealArea}>
                  <AppText style={styles.revealPrompt} tone="secondary">
                    Recall the meaning before revealing the answer.
                  </AppText>
                  <AppButton label="Show meaning" onPress={() => setIsRevealed(true)} />
                </View>
              ) : (
                <View style={styles.answerArea}>
                  <View style={styles.definitionBlock}>
                    <AppText tone="tertiary" variant="caption">
                      DEFINITION
                    </AppText>
                    <AppText>
                      {currentWord.simpleDefinition ||
                        currentWord.definition ||
                        'No definition has been added yet.'}
                    </AppText>
                  </View>
                  {currentWord.examples[0] ? (
                    <View style={styles.exampleBlock}>
                      <AppText tone="tertiary" variant="caption">
                        EXAMPLE
                      </AppText>
                      <AppText>{currentWord.examples[0]}</AppText>
                    </View>
                  ) : null}
                  {currentWord.sourceSentence ? (
                    <View style={styles.exampleBlock}>
                      <AppText tone="tertiary" variant="caption">
                        YOUR CONTEXT
                      </AppText>
                      <AppText>{currentWord.sourceSentence}</AppText>
                    </View>
                  ) : null}
                </View>
              )}
            </Card>
          ) : dueCount > 0 || isLoading ? (
            <View style={styles.loadingNext}>
              <ActivityIndicator color={theme.colors.brand.primary} />
              <AppText tone="secondary">Loading the next words…</AppText>
            </View>
          ) : (
            <Card style={styles.completeCard}>
              <View style={styles.completeIcon}>
                <MaterialIcons
                  color={theme.colors.semantic.success.foreground}
                  name="check-circle"
                  size={38}
                />
              </View>
              <AppText variant="title">Session complete</AppText>
              <AppText style={styles.centeredText} tone="secondary">
                You reviewed {reviewedThisSession}{' '}
                {reviewedThisSession === 1 ? 'word' : 'words'}. Your next reviews will appear when
                they are due.
              </AppText>
              <AppButton
                label="Finish"
                onPress={() => setIsSessionActive(false)}
                variant="secondary"
              />
            </Card>
          )}

          {isRevealed && currentWord ? (
            <View style={styles.responseSection}>
              <AppText style={styles.centeredText} tone="secondary" variant="label">
                How well did you remember it?
              </AppText>
              <View style={styles.responseButtons}>
                <ResponseButton
                  disabled={isSubmitting}
                  icon="refresh"
                  label="Forgot"
                  onPress={() => void respond('forgot')}
                  tone="error"
                />
                <ResponseButton
                  disabled={isSubmitting}
                  icon="help-outline"
                  label="Not sure"
                  onPress={() => void respond('not_sure')}
                  tone="warning"
                />
                <ResponseButton
                  disabled={isSubmitting}
                  icon="check"
                  label="I know this"
                  onPress={() => void respond('know')}
                  tone="success"
                />
              </View>
              {actionError ? (
                <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
                  {actionError}
                </AppText>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          description="Strengthen your vocabulary with short, focused practice."
          eyebrow="Make it stick"
          title="Review"
        />

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <AppText variant="title">{dueCount}</AppText>
            <AppText tone="tertiary" variant="caption">
              DUE NOW
            </AppText>
          </Card>
          <Card style={styles.statCard}>
            <AppText variant="title">{reviewedToday}</AppText>
            <AppText tone="tertiary" variant="caption">
              REVIEWED TODAY
            </AppText>
          </Card>
        </View>

        {error && dueWords.length === 0 ? (
          <EmptyState
            actionLabel="Try again"
            description="Your local review queue could not be loaded."
            icon="error-outline"
            onAction={() => void refresh()}
            title="Review unavailable"
          />
        ) : dueCount > 0 ? (
          <Card style={styles.startCard}>
            <View style={styles.startIcon}>
              <MaterialIcons color={theme.colors.brand.primary} name="school" size={30} />
            </View>
            <View style={styles.startCopy}>
              <AppText variant="subtitle">Your review queue is ready</AppText>
              <AppText tone="secondary">
                Work through {dueCount} {dueCount === 1 ? 'word' : 'words'} at your own pace.
              </AppText>
            </View>
            <AppButton label="Start review" onPress={startSession} />
          </Card>
        ) : (
          <EmptyState
            actionLabel={wordCount === 0 ? 'Add a word' : undefined}
            description={
              wordCount === 0
                ? 'Save a few words first. They will appear here for practice.'
                : 'You have reviewed everything due. Come back when the next word is ready.'
            }
            icon={wordCount === 0 ? 'menu-book' : 'done-all'}
            onAction={wordCount === 0 ? () => router.push('/(tabs)/add') : undefined}
            title={wordCount === 0 ? 'Nothing to review yet' : 'You are caught up'}
          />
        )}

        {recentReviews.length > 0 ? <RecentActivity reviews={recentReviews} /> : null}
      </ScrollView>
    </Screen>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const styles = useStyles();
  const boundedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View
      accessibilityLabel={`${Math.round(boundedProgress * 100)} percent complete`}
      accessibilityRole="progressbar"
      style={styles.progressTrack}
    >
      <View style={[styles.progressFill, { width: `${boundedProgress * 100}%` }]} />
    </View>
  );
}

function ResponseButton({
  disabled,
  icon,
  label,
  onPress,
  tone,
}: {
  disabled: boolean;
  icon: 'check' | 'help-outline' | 'refresh';
  label: string;
  onPress: () => void;
  tone: 'error' | 'success' | 'warning';
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const colors = theme.colors.semantic[tone];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.responseButton,
        { backgroundColor: colors.background },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <MaterialIcons color={colors.foreground} name={icon} size={21} />
      <AppText style={{ color: colors.foreground }} variant="label">
        {label}
      </AppText>
    </Pressable>
  );
}

function RecentActivity({ reviews }: { reviews: VocabularyReviewHistoryItem[] }) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={styles.recentSection}>
      <AppText variant="subtitle">Recent activity</AppText>
      <Card style={styles.recentCard}>
        {reviews.map((review, index) => (
          <Pressable
            accessibilityRole="button"
            key={review.id}
            onPress={() =>
              router.push({ pathname: '/word/[id]', params: { id: review.wordId } })
            }
            style={[styles.recentRow, index > 0 && styles.recentRowBorder]}
          >
            <View style={styles.recentIcon}>
              <MaterialIcons
                color={theme.colors.brand.primary}
                name={review.response === 'know' ? 'check' : review.response === 'forgot' ? 'refresh' : 'help-outline'}
                size={18}
              />
            </View>
            <View style={styles.recentCopy}>
              <AppText variant="label">{review.word}</AppText>
              <AppText tone="tertiary" variant="caption">
                {responseLabel(review.response)} · {intervalLabel(review.intervalDays)}
              </AppText>
            </View>
            <AppText tone="tertiary" variant="caption">
              {formatReviewTime(review.reviewedAt)}
            </AppText>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

function responseLabel(response: ReviewResponse): string {
  if (response === 'know') return 'Knew it';
  if (response === 'forgot') return 'Forgot';
  return 'Not sure';
}

function intervalLabel(intervalDays: number): string {
  if (intervalDays === 0) return 'again in 10 min';
  return `again in ${intervalDays} ${intervalDays === 1 ? 'day' : 'days'}`;
}

function formatReviewTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const useStyles = createThemedStyles((theme) => ({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    gap: theme.spacing.lg,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  startCard: {
    gap: theme.spacing.md,
  },
  startIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.pill,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  startCopy: {
    gap: theme.spacing.xs,
  },
  sessionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionHeadingCopy: {
    gap: theme.spacing.xxs,
  },
  endSessionText: {
    color: theme.colors.brand.primary,
  },
  progressTrack: {
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.pill,
    height: 7,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.radius.pill,
    height: '100%',
  },
  reviewCard: {
    gap: theme.spacing.xl,
    minHeight: 340,
  },
  wordHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  wordCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  reviewWord: {
    flexShrink: 1,
  },
  categoryPill: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  categoryDot: {
    borderRadius: theme.radius.pill,
    height: 8,
    width: 8,
  },
  revealArea: {
    flex: 1,
    gap: theme.spacing.lg,
    justifyContent: 'center',
  },
  revealPrompt: {
    textAlign: 'center',
  },
  answerArea: {
    gap: theme.spacing.lg,
  },
  definitionBlock: {
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.md,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  exampleBlock: {
    gap: theme.spacing.xs,
  },
  responseSection: {
    gap: theme.spacing.sm,
  },
  responseButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  responseButton: {
    alignItems: 'center',
    borderRadius: theme.radius.md,
    flex: 1,
    gap: theme.spacing.xs,
    justifyContent: 'center',
    minHeight: 68,
    paddingHorizontal: theme.spacing.xs,
  },
  pressed: {
    opacity: 0.68,
  },
  disabled: {
    opacity: 0.45,
  },
  errorText: {
    color: theme.colors.semantic.error.foreground,
    textAlign: 'center',
  },
  loadingNext: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.sm,
    justifyContent: 'center',
    minHeight: 280,
  },
  completeCard: {
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
  },
  completeIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.semantic.success.background,
    borderRadius: theme.radius.pill,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  centeredText: {
    textAlign: 'center',
  },
  recentSection: {
    gap: theme.spacing.sm,
  },
  recentCard: {
    paddingVertical: theme.spacing.xs,
  },
  recentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 62,
    paddingVertical: theme.spacing.sm,
  },
  recentRowBorder: {
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
  },
  recentIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  recentCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
}));
