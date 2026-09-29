import { DatamuseEntryNotFoundError, parseDatamuseResponse } from './datamuse-parser';

describe('Datamuse response parser', () => {
  it('normalizes definitions, parts of speech, IPA, and attribution', () => {
    const result = parseDatamuseResponse(
      [
        {
          word: 'ephemeral',
          tags: ['query', 'adj', 'n', 'ipa_pron:ɪfˈɛmɝʌɫ'],
          defs: [
            'adj\tLasting for a short period of time. ',
            'n\tSomething which lasts for a short period of time. ',
          ],
        },
      ],
      'ephemeral',
    );

    expect(result).toEqual({
      word: 'ephemeral',
      pronunciation: '/ɪfˈɛmɝʌɫ/',
      audioUrl: null,
      senses: [
        {
          id: 'datamuse-0',
          definition: 'Lasting for a short period of time.',
          partOfSpeech: 'adjective',
          example: null,
          synonyms: [],
          antonyms: [],
        },
        {
          id: 'datamuse-1',
          definition: 'Something which lasts for a short period of time.',
          partOfSpeech: 'noun',
          example: null,
          synonyms: [],
          antonyms: [],
        },
      ],
      attribution: {
        providerName: 'Datamuse',
        providerUrl: 'https://www.datamuse.com/api/',
        sourceUrl: null,
        licenseName: null,
        licenseUrl: null,
      },
    });
  });

  it('uses the query entry instead of a similar spelling returned afterward', () => {
    const result = parseDatamuseResponse(
      [
        { word: 'ice cream', tags: ['query', 'n'], defs: ['n\tA frozen dessert.'] },
        { word: 'nice cream', tags: ['n'], defs: ['n\tA nondairy dessert.'] },
      ],
      'ice cream',
    );

    expect(result.word).toBe('ice cream');
    expect(result.senses[0].definition).toBe('A frozen dessert.');
  });

  it('reports a missing word when the query entry has no definitions', () => {
    expect(() =>
      parseDatamuseResponse(
        [{ word: 'wordechothisisnotaword', tags: ['query', 'ipa_pron:test'] }],
        'wordechothisisnotaword',
      ),
    ).toThrow(DatamuseEntryNotFoundError);
  });

  it('rejects malformed provider responses separately from missing entries', () => {
    expect(() => parseDatamuseResponse({ error: 'bad response' }, 'ephemeral')).toThrow(
      'invalid response',
    );
  });
});
