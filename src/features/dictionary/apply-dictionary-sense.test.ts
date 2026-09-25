import { EMPTY_WORD_FORM_VALUES } from '@/features/vocabulary/word-form-values';

import {
  applyDictionarySenseToWordForm,
  toAiDictionaryGrounding,
} from './apply-dictionary-sense';

const selection = {
  lookup: {
    word: 'ephemeral',
    pronunciation: '/ɪˈfɛmərəl/',
    audioUrl: null,
    senses: [],
    attribution: {
      providerName: 'Free Dictionary API',
      providerUrl: 'https://dictionaryapi.dev/',
      sourceUrl: 'https://en.wiktionary.org/wiki/ephemeral',
      licenseName: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    },
  },
  sense: {
    id: 'sense-1',
    definition: 'Lasting for a very short time.',
    partOfSpeech: 'adjective',
    example: 'The rainbow was ephemeral.',
    synonyms: ['brief', 'fleeting'],
    antonyms: ['lasting'],
  },
};

describe('dictionary sense form mapping', () => {
  it('prefills dictionary fields without changing the user-entered word', () => {
    const result = applyDictionarySenseToWordForm(
      { ...EMPTY_WORD_FORM_VALUES, word: 'Ephemeral', personalNotes: 'Remember this.' },
      selection,
    );

    expect(result).toMatchObject({
      word: 'Ephemeral',
      definition: 'Lasting for a very short time.',
      pronunciation: '/ɪˈfɛmərəl/',
      partOfSpeech: 'adjective',
      examples: 'The rainbow was ephemeral.',
      synonyms: 'brief, fleeting',
      antonyms: 'lasting',
      personalNotes: 'Remember this.',
      definitionAttribution: selection.lookup.attribution,
    });
  });

  it('turns the selected sense into explicit AI grounding', () => {
    expect(toAiDictionaryGrounding(selection)).toEqual({
      definition: 'Lasting for a very short time.',
      partOfSpeech: 'adjective',
      example: 'The rainbow was ephemeral.',
      sourceName: 'Free Dictionary API',
    });
  });
});
