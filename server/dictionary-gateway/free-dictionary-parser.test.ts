import { parseFreeDictionaryResponse } from './free-dictionary-parser';

describe('Free Dictionary API response parser', () => {
  it('normalizes meanings, related words, audio, and attribution', () => {
    const result = parseFreeDictionaryResponse(
      [
        {
          word: 'ephemeral',
          phonetics: [
            { text: '/ɪˈfɛmərəl/', audio: '//example.com/ephemeral.mp3' },
          ],
          meanings: [
            {
              partOfSpeech: 'adjective',
              synonyms: ['brief'],
              antonyms: [],
              definitions: [
                {
                  definition: 'Lasting for a very short time.',
                  example: 'The rainbow was ephemeral.',
                  synonyms: ['fleeting'],
                  antonyms: ['lasting'],
                },
              ],
            },
          ],
          sourceUrls: ['https://en.wiktionary.org/wiki/ephemeral'],
          license: {
            name: 'CC BY-SA 3.0',
            url: 'https://creativecommons.org/licenses/by-sa/3.0',
          },
        },
      ],
      'ephemeral',
    );

    expect(result).toMatchObject({
      word: 'ephemeral',
      pronunciation: '/ɪˈfɛmərəl/',
      audioUrl: 'https://example.com/ephemeral.mp3',
      senses: [
        expect.objectContaining({
          definition: 'Lasting for a very short time.',
          synonyms: ['brief', 'fleeting'],
          antonyms: ['lasting'],
        }),
      ],
      attribution: {
        providerName: 'Free Dictionary API',
        providerUrl: 'https://dictionaryapi.dev/',
        sourceUrl: 'https://en.wiktionary.org/wiki/ephemeral',
        licenseName: 'CC BY-SA 3.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
      },
    });
  });

  it('rejects provider responses without usable meanings', () => {
    expect(() => parseFreeDictionaryResponse([{ word: 'unknown' }], 'unknown')).toThrow(
      'no usable meanings',
    );
  });
});
