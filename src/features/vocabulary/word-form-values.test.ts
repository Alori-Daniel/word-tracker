import type { VocabularyWord } from '@/domain/vocabulary';

import {
  EMPTY_WORD_FORM_VALUES,
  getWordFormValidationError,
  toWordInput,
  valuesFromWord,
  type WordFormValues,
} from './word-form-values';

describe('word form values', () => {
  it('requires only a word and meaning', () => {
    expect(getWordFormValidationError(EMPTY_WORD_FORM_VALUES)).toBe(
      'Enter the word you want to save.',
    );
    expect(
      getWordFormValidationError({ ...EMPTY_WORD_FORM_VALUES, word: 'Ephemeral' }),
    ).toBe('Add a meaning for this word.');
    expect(
      getWordFormValidationError({
        ...EMPTY_WORD_FORM_VALUES,
        definition: 'Lasting for a short time.',
        word: 'Ephemeral',
      }),
    ).toBeNull();
  });

  it('converts free-form lists without breaking commas inside examples', () => {
    const values: WordFormValues = {
      antonyms: 'lasting; permanent\n enduring ',
      categoryId: 'category-1',
      definition: 'Lasting for a short time.',
      examples: 'The moment was brief, but memorable.\n\nA short-lived trend.',
      isFavorite: true,
      partOfSpeech: 'adjective',
      personalNotes: 'Remember the mayfly.',
      pronunciation: 'ih-FEM-er-uhl',
      simpleDefinition: 'Not lasting long.',
      source: 'Book',
      sourceSentence: 'Beauty can be ephemeral.',
      status: 'familiar',
      synonyms: 'brief, fleeting; short-lived',
      word: 'Ephemeral',
    };

    expect(toWordInput(values)).toEqual(
      expect.objectContaining({
        examples: ['The moment was brief, but memorable.', 'A short-lived trend.'],
        synonyms: ['brief', 'fleeting', 'short-lived'],
        antonyms: ['lasting', 'permanent', 'enduring'],
        categoryId: 'category-1',
        isFavorite: true,
        status: 'familiar',
      }),
    );
  });

  it('hydrates editable values from a stored word', () => {
    const word: VocabularyWord = {
      id: 'word-1',
      userId: null,
      localUserId: 'guest-1',
      word: 'Ephemeral',
      pronunciation: null,
      definition: 'Brief.',
      simpleDefinition: null,
      partOfSpeech: 'adjective',
      examples: ['Example one.', 'Example two.'],
      synonyms: ['fleeting', 'brief'],
      antonyms: ['lasting'],
      personalNotes: null,
      source: null,
      sourceSentence: null,
      categoryId: null,
      status: 'learning',
      isFavorite: false,
      nextReviewAt: null,
      createdAt: '2026-09-25T00:00:00.000Z',
      updatedAt: '2026-09-25T00:00:00.000Z',
      syncStatus: 'local',
      revision: 1,
    };

    expect(valuesFromWord(word)).toEqual(
      expect.objectContaining({
        examples: 'Example one.\nExample two.',
        synonyms: 'fleeting, brief',
        pronunciation: '',
        word: 'Ephemeral',
      }),
    );
  });
});
