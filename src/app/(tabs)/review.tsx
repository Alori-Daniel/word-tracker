import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { AppButton, AppText, EmptyState, Screen } from '@/components/ui';
import { appendUniqueById, shuffleItems } from '@/domain/practice-session';
import type { ReviewResponse, VocabularyReviewHistoryItem } from '@/domain/vocabulary';
import { useReview } from '@/features/review';
import { useVocabulary } from '@/features/vocabulary';
import { createThemedStyles, useAppTheme } from '@/theme';

export default function ReviewScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { categories, listWords, wordCount } = useVocabulary();
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
  const [sessionMode, setSessionMode] = useState<'practice' | 'scheduled' | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionTarget, setSessionTarget] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [practiceQueue, setPracticeQueue] = useState<typeof dueWords>([]);
  const [practiceSource, setPracticeSource] = useState<typeof dueWords>([]);
  const [missedPracticeWords, setMissedPracticeWords] = useState<typeof dueWords>([]);
  const [practicedThisSession, setPracticedThisSession] = useState(0);
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);
  const currentWord = sessionMode === 'practice' ? practiceQueue[0] : dueWords[0];
  const completedThisSession =
    sessionMode === 'practice' ? practicedThisSession : reviewedThisSession;
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

  function startScheduledSession() {
    resetSession();
    setSessionTarget(dueCount);
    setIsRevealed(false);
    setActionError(null);
    setSessionMode('scheduled');
  }

  async function loadAllWords() {
    const pageSize = 200;
    const words: typeof dueWords = [];

    for (let offset = 0; ; offset += pageSize) {
      const page = await listWords({ limit: pageSize, offset });
      words.push(...page);
      if (page.length < pageSize) break;
    }

    return words;
  }

  function beginPractice(words: typeof dueWords) {
    const shuffledWords = shuffleItems(words);
    setPracticeSource(words);
    setPracticeQueue(shuffledWords);
    setMissedPracticeWords([]);
    setPracticedThisSession(0);
    setSessionTarget(shuffledWords.length);
    setIsRevealed(false);
    setActionError(null);
    setSessionMode('practice');
  }

  async function startPracticeSession() {
    setIsPracticeLoading(true);
    setActionError(null);

    try {
      const words = await loadAllWords();
      beginPractice(words);
    } catch {
      setActionError('Your words could not be loaded for practice. Please try again.');
    } finally {
      setIsPracticeLoading(false);
    }
  }

  function startMissedWordsRound() {
    const shuffledWords = shuffleItems(missedPracticeWords);
    setPracticeQueue(shuffledWords);
    setMissedPracticeWords([]);
    setPracticedThisSession(0);
    setSessionTarget(shuffledWords.length);
    setIsRevealed(false);
    setActionError(null);
  }

  async function respond(response: ReviewResponse) {
    if (!currentWord) {
      return;
    }

    setActionError(null);

    if (sessionMode === 'practice') {
      if (response === 'forgot') {
        setMissedPracticeWords((current) => appendUniqueById(current, currentWord));
      }
      setPracticeQueue((current) => current.slice(1));
      setPracticedThisSession((current) => current + 1);
      setIsRevealed(false);
      return;
    }

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

  if (sessionMode) {
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
                {sessionMode === 'practice' ? 'FREE PRACTICE' : 'SCHEDULED REVIEW'}
              </AppText>
              <AppText variant="subtitle">
                {Math.min(completedThisSession + (currentWord ? 1 : 0), sessionTarget)} of{' '}
                {sessionTarget}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSessionMode(null)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <AppText style={styles.endSessionText} variant="label">
                End session
              </AppText>
            </Pressable>
          </View>
          <ProgressBar
            progress={sessionTarget === 0 ? 1 : completedThisSession / sessionTarget}
          />

          {currentWord ? (
            <View style={styles.reviewCard}>
              <View style={styles.wordHeading}>
                <View style={styles.wordCopy}>
                  <AppText style={styles.reviewWord} variant="editorial">
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
            </View>
          ) : sessionMode === 'scheduled' && (dueCount > 0 || isLoading) ? (
            <View style={styles.loadingNext}>
              <ActivityIndicator color={theme.colors.brand.primary} />
              <AppText tone="secondary">Loading the next words…</AppText>
            </View>
          ) : (
            <View style={styles.completeCard}>
              <View style={styles.completeIcon}>
                <MaterialIcons
                  color={theme.colors.semantic.success.foreground}
                  name="check-circle"
                  size={38}
                />
              </View>
              <AppText variant="title">Session complete</AppText>
              <AppText style={styles.centeredText} tone="secondary">
                You {sessionMode === 'practice' ? 'practised' : 'reviewed'}{' '}
                {completedThisSession}{' '}
                {completedThisSession === 1 ? 'word' : 'words'}.
                {sessionMode === 'scheduled'
                  ? ' Your next reviews will appear when they are due.'
                  : ' Your scheduled review dates were not changed.'}
              </AppText>
              {sessionMode === 'practice' && missedPracticeWords.length > 0 ? (
                <AppButton
                  label={`Retry missed (${missedPracticeWords.length})`}
                  onPress={startMissedWordsRound}
                />
              ) : null}
              {sessionMode === 'practice' && practiceSource.length > 0 ? (
                <AppButton
                  label="Practice again"
                  onPress={() => beginPractice(practiceSource)}
                  variant="secondary"
                />
              ) : null}
              {sessionMode === 'scheduled' && wordCount > 0 ? (
                <AppButton
                  label="Practice all words"
                  loading={isPracticeLoading}
                  onPress={() => void startPracticeSession()}
                />
              ) : null}
              <AppButton
                label="Finish"
                onPress={() => setSessionMode(null)}
                variant="ghost"
              />
              {actionError ? (
                <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
                  {actionError}
                </AppText>
              ) : null}
            </View>
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
        <View style={styles.pageHeading}>
          <AppText tone="tertiary" variant="caption">DAILY PRACTICE</AppText>
          <AppText style={styles.pageTitle} variant="editorial">Make it stick</AppText>
          <AppText tone="secondary">A few focused minutes keeps useful words close.</AppText>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <AppText variant="title">{dueCount}</AppText>
            <AppText tone="tertiary" variant="caption">
              DUE NOW
            </AppText>
          </View>
          <View style={styles.statCard}>
            <AppText variant="title">{reviewedToday}</AppText>
            <AppText tone="tertiary" variant="caption">
              REVIEWED TODAY
            </AppText>
          </View>
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
          <View style={styles.startCard}>
            <View style={styles.startIcon}>
              <MaterialIcons color={theme.colors.brand.primary} name="school" size={30} />
            </View>
            <View style={styles.startCopy}>
              <AppText variant="subtitle">Your review queue is ready</AppText>
              <AppText tone="secondary">
                Work through {dueCount} {dueCount === 1 ? 'word' : 'words'} at your own pace.
              </AppText>
            </View>
            <AppButton label="Start review" onPress={startScheduledSession} />
          </View>
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

        {wordCount > 0 ? (
          <View style={styles.practiceSection}>
            <View style={styles.practiceHeading}>
              <View style={styles.startIcon}>
                <MaterialIcons
                  color={theme.colors.brand.primary}
                  name="all-inclusive"
                  size={30}
                />
              </View>
              <View style={styles.startCopy}>
                <AppText variant="subtitle">Practice all words</AppText>
                <AppText tone="secondary">
                  Shuffle through your entire library anytime. Practice does not change your review
                  schedule.
                </AppText>
              </View>
            </View>
            <AppButton
              label="Start free practice"
              loading={isPracticeLoading}
              onPress={() => void startPracticeSession()}
              variant="secondary"
            />
            {actionError && !sessionMode ? (
              <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
                {actionError}
              </AppText>
            ) : null}
          </View>
        ) : null}

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
        { backgroundColor: colors.background, borderTopColor: colors.foreground },
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
      <View style={styles.recentCard}>
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
      </View>
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
  pageHeading: {
    gap: theme.spacing.sm,
  },
  pageTitle: {
    fontSize: 38,
    lineHeight: 44,
  },
  statCard: {
    borderTopColor: theme.colors.border.strong,
    borderTopWidth: 1,
    flex: 1,
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
  },
  startCard: {
    borderBottomColor: theme.colors.border.subtle,
    borderBottomWidth: 1,
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
  },
  startIcon: {
    alignItems: 'center',
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  startCopy: {
    gap: theme.spacing.xs,
  },
  practiceSection: {
    borderBottomColor: theme.colors.border.subtle,
    borderBottomWidth: 1,
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
  },
  practiceHeading: {
    gap: theme.spacing.md,
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
    alignItems: 'stretch',
    gap: theme.spacing.xl,
    justifyContent: 'center',
    minHeight: 390,
    paddingVertical: theme.spacing.xl,
  },
  wordHeading: {
    alignItems: 'center',
    flexDirection: 'column',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  wordCopy: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.xs,
  },
  reviewWord: {
    flexShrink: 1,
    fontSize: 44,
    lineHeight: 52,
    textAlign: 'center',
  },
  categoryPill: {
    alignItems: 'center',
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
    borderLeftColor: theme.colors.brand.primary,
    borderLeftWidth: 3,
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
    borderTopWidth: 2,
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
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
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
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  recentCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
}));
