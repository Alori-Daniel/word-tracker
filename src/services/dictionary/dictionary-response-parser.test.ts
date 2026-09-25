import { parseDictionaryGatewayResponse } from './dictionary-response-parser';

const response = {
  data: {
    word: 'ephemeral',
    pronunciation: '/ɪˈfɛmərəl/',
    audioUrl: 'https://example.com/audio.mp3',
    senses: [
      {
        id: '0-0-0',
        definition: 'Lasting for a very short time.',
        partOfSpeech: 'adjective',
        example: null,
        synonyms: ['brief'],
        antonyms: ['lasting'],
      },
    ],
    attribution: {
      providerName: 'Free Dictionary API',
      providerUrl: 'https://dictionaryapi.dev/',
      sourceUrl: null,
      licenseName: null,
      licenseUrl: null,
    },
  },
  meta: { requestId: 'request-1', cached: false },
};

describe('dictionary response parser', () => {
  it('accepts a bounded, attributed dictionary response', () => {
    expect(parseDictionaryGatewayResponse(response)).toEqual({
      lookup: response.data,
      metadata: response.meta,
    });
  });

  it('rejects insecure attribution URLs', () => {
    expect(() =>
      parseDictionaryGatewayResponse({
        ...response,
        data: {
          ...response.data,
          attribution: {
            ...response.data.attribution,
            providerUrl: 'http://dictionary.example.com',
          },
        },
      }),
    ).toThrow('must use HTTPS');
  });

  it('rejects responses with no meanings', () => {
    expect(() =>
      parseDictionaryGatewayResponse({
        ...response,
        data: { ...response.data, senses: [] },
      }),
    ).toThrow('between 1 and 20 meanings');
  });
});
