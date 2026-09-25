import type { DictionaryAttribution } from './dictionary';

export const LEARNING_STATUSES = ['learning', 'familiar', 'mastered'] as const;
export const REVIEW_RESPONSES = ['know', 'not_sure', 'forgot'] as const;
export const SYNC_STATUSES = ['local', 'pending', 'synced', 'error'] as const;

export type LearningStatus = (typeof LEARNING_STATUSES)[number];
export type ReviewResponse = (typeof REVIEW_RESPONSES)[number];
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export type GuestIdentity = {
  localUserId: string;
  deviceId: string;
  linkedUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  userId: string | null;
  localUserId: string | null;
  name: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type VocabularyWord = {
  id: string;
  userId: string | null;
  localUserId: string | null;
  word: string;
  pronunciation: string | null;
  definition: string;
  definitionAttribution: DictionaryAttribution | null;
  simpleDefinition: string | null;
  partOfSpeech: string | null;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  personalNotes: string | null;
  source: string | null;
  sourceSentence: string | null;
  categoryId: string | null;
  status: LearningStatus;
  isFavorite: boolean;
  nextReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  revision: number;
};

export type CreateWordInput = {
  word: string;
  pronunciation?: string | null;
  definition?: string;
  definitionAttribution?: DictionaryAttribution | null;
  simpleDefinition?: string | null;
  partOfSpeech?: string | null;
  examples?: readonly string[];
  synonyms?: readonly string[];
  antonyms?: readonly string[];
  personalNotes?: string | null;
  source?: string | null;
  sourceSentence?: string | null;
  categoryId?: string | null;
  status?: LearningStatus;
  isFavorite?: boolean;
  nextReviewAt?: string | null;
};

export type UpdateWordInput = Partial<CreateWordInput>;

export type WordListOptions = {
  query?: string;
  status?: LearningStatus;
  categoryId?: string;
  limit?: number;
  offset?: number;
};

export type VocabularyReview = {
  id: string;
  wordId: string;
  userId: string | null;
  localUserId: string | null;
  response: ReviewResponse;
  reviewedAt: string;
  scheduledFor: string | null;
  nextReviewAt: string | null;
  intervalDays: number;
  easeFactor: number;
  createdAt: string;
};

export type VocabularyReviewHistoryItem = VocabularyReview & {
  word: string;
};
