import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useLocalData } from '@/data';
import { calculateReviewSchedule, type ReviewSchedule } from '@/domain/review-scheduler';
import type {
  ReviewResponse,
  VocabularyReviewHistoryItem,
  VocabularyWord,
} from '@/domain/vocabulary';
import { useVocabulary } from '@/features/vocabulary';

type ReviewContextValue = {
  dueCount: number;
  dueWords: VocabularyWord[];
  error: Error | null;
  hasLoaded: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  recentReviews: VocabularyReviewHistoryItem[];
  refresh: () => Promise<void>;
  resetSession: () => void;
  reviewedThisSession: number;
  reviewedToday: number;
  submitReview: (word: VocabularyWord, response: ReviewResponse) => Promise<ReviewSchedule>;
};

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({ children }: PropsWithChildren) {
  const { repositories } = useLocalData();
  const { refresh: refreshVocabulary, revision: vocabularyRevision } = useVocabulary();
  const [dueWords, setDueWords] = useState<VocabularyWord[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [reviewedToday, setReviewedToday] = useState(0);
  const [reviewedThisSession, setReviewedThisSession] = useState(0);
  const [recentReviews, setRecentReviews] = useState<VocabularyReviewHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const refreshVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();
    setIsLoading(true);
    setError(null);

    try {
      const [nextDueWords, nextDueCount, nextReviewedToday, nextRecentReviews] =
        await Promise.all([
          repositories.reviews.listDue({ now: now.toISOString(), limit: 50 }),
          repositories.reviews.countDue(now.toISOString()),
          repositories.reviews.countReviewedSince(startOfToday),
          repositories.reviews.listRecent(5),
        ]);

      if (refreshVersion.current === version) {
        setDueWords(nextDueWords);
        setDueCount(nextDueCount);
        setReviewedToday(nextReviewedToday);
        setRecentReviews(nextRecentReviews);
      }
    } catch (nextError) {
      if (refreshVersion.current === version) {
        setError(
          nextError instanceof Error ? nextError : new Error('The review queue could not load.'),
        );
      }
    } finally {
      if (refreshVersion.current === version) {
        setHasLoaded(true);
        setIsLoading(false);
      }
    }
  }, [repositories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timer);
  }, [refresh, vocabularyRevision]);

  const submitReview = useCallback(
    async (word: VocabularyWord, response: ReviewResponse) => {
      if (isSubmitting) {
        throw new Error('A review is already being saved.');
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const latestReview = await repositories.reviews.getLatestForWord(word.id);
        const schedule = calculateReviewSchedule({
          currentStatus: word.status,
          now: new Date(),
          previousEaseFactor: latestReview?.easeFactor,
          previousIntervalDays: latestReview?.intervalDays,
          response,
        });
        const review = await repositories.reviews.record({
          wordId: word.id,
          response,
          scheduledFor: word.nextReviewAt,
          nextReviewAt: schedule.nextReviewAt,
          intervalDays: schedule.intervalDays,
          easeFactor: schedule.easeFactor,
          status: schedule.status,
        });

        setDueWords((current) => current.filter((item) => item.id !== word.id));
        setDueCount((current) => Math.max(0, current - 1));
        setReviewedToday((current) => current + 1);
        setReviewedThisSession((current) => current + 1);
        setRecentReviews((current) => [{ ...review, word: word.word }, ...current].slice(0, 5));
        await refreshVocabulary();
        await refresh();

        return schedule;
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError : new Error('The review could not be saved.'),
        );
        throw nextError;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, refresh, refreshVocabulary, repositories],
  );

  const resetSession = useCallback(() => setReviewedThisSession(0), []);

  const value = useMemo<ReviewContextValue>(
    () => ({
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
    }),
    [
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
    ],
  );

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReview(): ReviewContextValue {
  const value = useContext(ReviewContext);

  if (!value) {
    throw new Error('useReview must be used within ReviewProvider.');
  }

  return value;
}
