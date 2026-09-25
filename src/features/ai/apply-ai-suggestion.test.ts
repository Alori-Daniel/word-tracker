import type { AiWordSuggestion } from '@/domain/ai';
import { EMPTY_WORD_FORM_VALUES } from '@/features/vocabulary/word-form-values';

import { applyAiSuggestionToWordForm } from './apply-ai-suggestion';

const suggestion: AiWordSuggestion = {
  word: 'Ephemeral',
  pronunciation: 'ih-FEM-er-uhl',
  definition: 'Lasting for a very short time.',
  simpleDefinition: 'Not lasting long.',
  partOfSpeech: 'adjective',
  examples: ['The rainbow was ephemeral.', 'Fame can be ephemeral.'],
  synonyms: ['brief', 'fleeting'],
  antonyms: ['lasting'],
  memoryTip: 'Think of a mayfly.',
  contextExplanation: 'Here it describes a moment that passed quickly.',
};

describe('applyAiSuggestionToWordForm', () => {
  it('applies generated language fields while preserving user-owned fields', () => {
    const current = {
      ...EMPTY_WORD_FORM_VALUES,
      word: 'ephemeral',
      categoryId: 'category-1',
      isFavorite: true,
      personalNotes: 'Found in chapter four.',
      source: 'Novel',
      sourceSentence: 'It was an ephemeral joy.',
      status: 'familiar' as const,
    };

    expect(applyAiSuggestionToWordForm(current, suggestion)).toEqual({
      ...current,
      pronunciation: 'ih-FEM-er-uhl',
      definition: 'Lasting for a very short time.',
      simpleDefinition: 'Not lasting long.',
      partOfSpeech: 'adjective',
      examples: 'The rainbow was ephemeral.\nFame can be ephemeral.',
      synonyms: 'brief, fleeting',
      antonyms: 'lasting',
      personalNotes:
        'Found in chapter four.\n\nMemory tip: Think of a mayfly.\n\nContext explanation: Here it describes a moment that passed quickly.',
    });
  });

  it('does not erase an existing optional value when AI returns null', () => {
    const result = applyAiSuggestionToWordForm(
      {
        ...EMPTY_WORD_FORM_VALUES,
        word: 'ephemeral',
        pronunciation: 'my pronunciation',
        partOfSpeech: 'my label',
      },
      { ...suggestion, pronunciation: null, partOfSpeech: null },
    );

    expect(result).toEqual(
      expect.objectContaining({
        word: 'ephemeral',
        pronunciation: 'my pronunciation',
        partOfSpeech: 'my label',
      }),
    );
  });
});
