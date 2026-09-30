import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useLocalData } from '@/data';
import {
  calculateWordAdditionStreak,
  EMPTY_WORD_ADDITION_STREAK,
  type WordAdditionStreak,
} from '@/domain/word-addition-streak';
import type {
  Category,
  CreateWordInput,
  UpdateWordInput,
  VocabularyWord,
  WordListOptions,
} from '@/domain/vocabulary';
import { useAccount } from '@/features/auth';

type CreateCategoryInput = {
  color: string;
  name: string;
};

type VocabularyContextValue = {
  categories: Category[];
  createCategory: (input: CreateCategoryInput) => Promise<Category>;
  createWord: (input: CreateWordInput) => Promise<VocabularyWord>;
  deleteCategory: (id: string) => Promise<boolean>;
  deleteWord: (id: string) => Promise<boolean>;
  error: Error | null;
  getWord: (id: string) => Promise<VocabularyWord | null>;
  isLoading: boolean;
  listWords: (options?: WordListOptions) => Promise<VocabularyWord[]>;
  recentWords: VocabularyWord[];
  refresh: () => Promise<void>;
  revision: number;
  updateWord: (id: string, input: UpdateWordInput) => Promise<VocabularyWord | null>;
  wordCount: number;
  wordAdditionStreak: WordAdditionStreak;
};

const VocabularyContext = createContext<VocabularyContextValue | null>(null);

export function VocabularyProvider({ children }: PropsWithChildren) {
  const { dataRevision, repositories } = useLocalData();
  const { queueSync } = useAccount();
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentWords, setRecentWords] = useState<VocabularyWord[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [wordAdditionStreak, setWordAdditionStreak] = useState(EMPTY_WORD_ADDITION_STREAK);
  const [revision, setRevision] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setError(null);

    try {
      const [nextCategories, nextRecentWords, nextWordCount, additionDates] = await Promise.all([
        repositories.categories.list(),
        repositories.words.list({ limit: 5 }),
        repositories.words.count(),
        repositories.words.listAdditionDates(),
      ]);

      setCategories(nextCategories);
      setRecentWords(nextRecentWords);
      setWordCount(nextWordCount);
      setWordAdditionStreak(calculateWordAdditionStreak(additionDates));
      setRevision((value) => value + 1);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError : new Error('Your WordEcho library could not load.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [repositories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timer);
  }, [dataRevision, refresh]);

  const createWord = useCallback(
    async (input: CreateWordInput) => {
      const word = await repositories.words.create(input);
      await refresh();
      queueSync();
      return word;
    },
    [queueSync, refresh, repositories],
  );

  const updateWord = useCallback(
    async (id: string, input: UpdateWordInput) => {
      const word = await repositories.words.update(id, input);
      await refresh();
      queueSync();
      return word;
    },
    [queueSync, refresh, repositories],
  );

  const deleteWord = useCallback(
    async (id: string) => {
      const deleted = await repositories.words.softDelete(id);
      await refresh();
      queueSync();
      return deleted;
    },
    [queueSync, refresh, repositories],
  );

  const createCategory = useCallback(
    async (input: CreateCategoryInput) => {
      const category = await repositories.categories.create(input);
      await refresh();
      queueSync();
      return category;
    },
    [queueSync, refresh, repositories],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const deleted = await repositories.categories.softDelete(id);
      await refresh();
      queueSync();
      return deleted;
    },
    [queueSync, refresh, repositories],
  );

  const listWords = useCallback(
    (options: WordListOptions = {}) => repositories.words.list(options),
    [repositories],
  );
  const getWord = useCallback((id: string) => repositories.words.getById(id), [repositories]);

  const value = useMemo<VocabularyContextValue>(
    () => ({
      categories,
      createCategory,
      createWord,
      deleteCategory,
      deleteWord,
      error,
      getWord,
      isLoading,
      listWords,
      recentWords,
      refresh,
      revision,
      updateWord,
      wordCount,
      wordAdditionStreak,
    }),
    [
      categories,
      createCategory,
      createWord,
      deleteCategory,
      deleteWord,
      error,
      getWord,
      isLoading,
      listWords,
      recentWords,
      refresh,
      revision,
      updateWord,
      wordCount,
      wordAdditionStreak,
    ],
  );

  return <VocabularyContext.Provider value={value}>{children}</VocabularyContext.Provider>;
}

export function useVocabulary(): VocabularyContextValue {
  const value = useContext(VocabularyContext);

  if (!value) {
    throw new Error('useVocabulary must be used within VocabularyProvider.');
  }

  return value;
}
