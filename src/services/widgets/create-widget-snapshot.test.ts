import type { Category, VocabularyWord } from '@/domain/vocabulary';
import {
  DEFAULT_WIDGET_PREFERENCES,
  parseWidgetPreferences,
  type WidgetPreferences,
} from '@/domain/widget';

import {
  advanceVocabularyWidgetSnapshot,
  createVocabularyWidgetSnapshot,
  shouldRotateVocabularyWidget,
} from './create-widget-snapshot';
import { vocabularyWidgetLinks } from './widget-links';
import {
  deserializeVocabularyWidgetSnapshot,
  parseVocabularyWidgetSnapshot,
} from './widget-snapshot-codec';
import { toIosPropertyListWidgetSnapshot } from './widget-property-list';
import { buildVocabularyWidgetTimeline } from './widget-timeline';

const NOW = new Date('2026-09-25T12:00:00.000Z');

const categories: Category[] = [
  {
    id: 'category-reading',
    userId: null,
    localUserId: 'guest-1',
    name: 'Reading',
    color: '#0878B8',
    isDefault: false,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    syncStatus: 'local',
  },
  {
    id: 'category-work',
    userId: null,
    localUserId: 'guest-1',
    name: 'Work',
    color: '#176641',
    isDefault: false,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    syncStatus: 'local',
  },
];

function createWord(
  overrides: Partial<VocabularyWord> & Pick<VocabularyWord, 'id' | 'word'>,
): VocabularyWord {
  const { id, word, ...rest } = overrides;

  return {
    id,
    userId: null,
    localUserId: 'guest-1',
    word,
    pronunciation: null,
    definition: `${word} definition`,
    definitionAttribution: null,
    simpleDefinition: null,
    partOfSpeech: null,
    examples: [],
    synonyms: [],
    antonyms: [],
    personalNotes: null,
    source: null,
    sourceSentence: null,
    categoryId: null,
    status: 'learning',
    isFavorite: false,
    nextReviewAt: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    syncStatus: 'local',
    revision: 1,
    ...rest,
  };
}

function preferences(overrides: Partial<WidgetPreferences> = {}): WidgetPreferences {
  return { ...DEFAULT_WIDGET_PREFERENCES, ...overrides };
}

describe('Vocabulary widget snapshot', () => {
  it('filters by source and category and uses the simple definition', () => {
    const words = [
      createWord({
        id: 'ephemeral',
        word: 'Ephemeral',
        categoryId: 'category-reading',
        isFavorite: true,
        simpleDefinition: 'Lasting a short time.',
      }),
      createWord({
        id: 'ubiquitous',
        word: 'Ubiquitous',
        categoryId: 'category-reading',
      }),
      createWord({
        id: 'circumspect',
        word: 'Circumspect',
        categoryId: 'category-work',
        isFavorite: true,
      }),
    ];

    const snapshot = createVocabularyWidgetSnapshot(
      words,
      categories,
      preferences({ contentSource: 'favorites', categoryId: 'category-reading' }),
      NOW,
    );

    expect(snapshot.sourceLabel).toBe('Favourites · Reading');
    expect(snapshot.words).toEqual([
      expect.objectContaining({
        id: 'ephemeral',
        definition: 'Lasting a short time.',
        categoryName: 'Reading',
      }),
    ]);
  });

  it('creates a stable random order within the same rotation window', () => {
    const words = ['one', 'two', 'three', 'four'].map((id) =>
      createWord({ id, word: id }),
    );
    const selectedPreferences = preferences({ contentSource: 'random' });

    const first = createVocabularyWidgetSnapshot(words, categories, selectedPreferences, NOW);
    const second = createVocabularyWidgetSnapshot(
      words,
      categories,
      selectedPreferences,
      new Date(NOW.getTime() + 30_000),
    );

    expect(first.words.map((word) => word.id)).toEqual(second.words.map((word) => word.id));
  });

  it('falls back to all categories when a saved category no longer exists', () => {
    const snapshot = createVocabularyWidgetSnapshot(
      [createWord({ id: 'one', word: 'One' })],
      categories,
      preferences({ categoryId: 'deleted-category' }),
      NOW,
    );

    expect(snapshot.preferences.categoryId).toBeNull();
    expect(snapshot.words).toHaveLength(1);
  });

  it('advances safely and detects when the configured interval elapsed', () => {
    const snapshot = createVocabularyWidgetSnapshot(
      [createWord({ id: 'one', word: 'One' }), createWord({ id: 'two', word: 'Two' })],
      categories,
      preferences({ rotationMinutes: 60 }),
      NOW,
    );

    expect(shouldRotateVocabularyWidget(snapshot, new Date(NOW.getTime() + 59 * 60_000))).toBe(
      false,
    );
    expect(shouldRotateVocabularyWidget(snapshot, new Date(NOW.getTime() + 60 * 60_000))).toBe(
      true,
    );
    expect(advanceVocabularyWidgetSnapshot(snapshot, NOW).currentIndex).toBe(1);
  });
});

describe('Vocabulary widget boundaries', () => {
  const snapshot = createVocabularyWidgetSnapshot(
    [createWord({ id: 'word/with space', word: 'Word' })],
    categories,
    preferences({ rotationMinutes: 60 }),
    NOW,
  );

  it('builds a bounded iOS timeline with advancing indices', () => {
    const timeline = buildVocabularyWidgetTimeline(snapshot, NOW);

    expect(timeline).toHaveLength(25);
    expect(timeline[0]).toEqual(expect.objectContaining({ date: NOW }));
    expect(timeline[1]?.date.toISOString()).toBe('2026-09-25T13:00:00.000Z');
    expect(timeline[1]?.props.currentIndex).toBe(0);
  });

  it('round-trips valid snapshots and rejects malformed snapshots', () => {
    expect(deserializeVocabularyWidgetSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(deserializeVocabularyWidgetSnapshot('{bad json')).toBeNull();
    expect(parseVocabularyWidgetSnapshot({ ...snapshot, version: 2 })).toBeNull();
  });

  it('validates stored preferences and encodes deep-link identifiers', () => {
    expect(parseWidgetPreferences({ rotationMinutes: 5, themeMode: 'neon' })).toEqual(
      DEFAULT_WIDGET_PREFERENCES,
    );
    expect(vocabularyWidgetLinks.editWord('word/with space')).toBe(
      'vocabularyvault://word/word%2Fwith%20space/edit',
    );
  });

  it('removes values that iOS property lists cannot persist', () => {
    const propertyListSnapshot = toIosPropertyListWidgetSnapshot(snapshot);

    expect(propertyListSnapshot.preferences.categoryId).toBe('');
    expect(propertyListSnapshot.words[0]).toEqual(
      expect.objectContaining({
        categoryName: '',
        example: '',
        partOfSpeech: '',
        pronunciation: '',
      }),
    );
  });
});
