import { parseAiGatewayResponse, parseAiWordSuggestion } from './ai-response-parser';

const validSuggestion = {
  word: 'Ephemeral',
  pronunciation: 'ih-FEM-er-uhl',
  definition: 'Lasting for a very short time.',
  simpleDefinition: 'Not lasting long.',
  partOfSpeech: 'adjective',
  examples: ['The rainbow was ephemeral.'],
  synonyms: ['brief', 'fleeting'],
  antonyms: ['lasting'],
  memoryTip: 'Think of a mayfly.',
  contextExplanation: null,
};

describe('AI response parsing', () => {
  it('parses and normalizes a valid gateway response', () => {
    expect(
      parseAiGatewayResponse({
        data: validSuggestion,
        meta: {
          requestId: 'request-1',
          provider: 'openai',
          model: 'configured-model',
          remaining: 9,
        },
      }),
    ).toEqual({
      suggestion: validSuggestion,
      metadata: {
        requestId: 'request-1',
        provider: 'openai',
        model: 'configured-model',
        remaining: 9,
      },
    });
  });

  it('turns blank optional text into null', () => {
    expect(
      parseAiWordSuggestion({
        ...validSuggestion,
        pronunciation: '   ',
        memoryTip: '',
      }),
    ).toEqual(expect.objectContaining({ pronunciation: null, memoryTip: null }));
  });

  it('rejects malformed or oversized content', () => {
    expect(() =>
      parseAiWordSuggestion({ ...validSuggestion, definition: '' }),
    ).toThrow('definition cannot be empty');

    expect(() =>
      parseAiWordSuggestion({
        ...validSuggestion,
        examples: Array.from({ length: 5 }, (_, index) => `Example ${index}`),
      }),
    ).toThrow('examples must be an array');
  });
});
