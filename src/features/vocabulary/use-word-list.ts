import { useCallback, useEffect, useRef, useState } from 'react';

import type { LearningStatus, VocabularyWord } from '@/domain/vocabulary';

import { useVocabulary } from './vocabulary-provider';

type UseWordListOptions = {
  categoryId?: string;
  query?: string;
  status?: LearningStatus;
};

const PAGE_SIZE = 50;

export function useWordList({ categoryId, query, status }: UseWordListOptions) {
  const { listWords, revision } = useVocabulary();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestVersion = useRef(0);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let isActive = true;
    const version = ++requestVersion.current;
    const timer = setTimeout(
      () => {
        setIsLoading(true);
        setIsLoadingMore(false);
        setError(null);
        setWords([]);
        setHasMore(false);

        void listWords({ categoryId, query, status, limit: PAGE_SIZE })
          .then((nextWords) => {
            if (isActive && requestVersion.current === version) {
              setWords(nextWords);
              setHasMore(nextWords.length === PAGE_SIZE);
            }
          })
          .catch((nextError: unknown) => {
            if (isActive && requestVersion.current === version) {
              setError(
                nextError instanceof Error
                  ? nextError
                  : new Error('The word list could not load.'),
              );
            }
          })
          .finally(() => {
            if (isActive && requestVersion.current === version) {
              setIsLoading(false);
            }
          });
      },
      query ? 180 : 0,
    );

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [categoryId, listWords, query, reloadToken, revision, status]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    const version = requestVersion.current;

    try {
      const nextWords = await listWords({
        categoryId,
        query,
        status,
        limit: PAGE_SIZE,
        offset: words.length,
      });
      if (requestVersion.current === version) {
        setWords((current) => [
          ...current,
          ...nextWords.filter((word) => !current.some((item) => item.id === word.id)),
        ]);
        setHasMore(nextWords.length === PAGE_SIZE);
      }
    } catch (nextError) {
      if (requestVersion.current === version) {
        setError(
          nextError instanceof Error ? nextError : new Error('More words could not be loaded.'),
        );
      }
    } finally {
      if (requestVersion.current === version) {
        setIsLoadingMore(false);
      }
    }
  }, [categoryId, hasMore, isLoading, isLoadingMore, listWords, query, status, words.length]);

  return { error, hasMore, isLoading, isLoadingMore, loadMore, reload, words };
}
