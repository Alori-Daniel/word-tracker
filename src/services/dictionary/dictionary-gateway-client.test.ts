import { DictionaryGatewayClient } from './dictionary-gateway-client';

const gatewayResponse = {
  data: {
    word: 'ephemeral',
    pronunciation: null,
    audioUrl: null,
    senses: [
      {
        id: '0-0-0',
        definition: 'Lasting for a very short time.',
        partOfSpeech: 'adjective',
        example: null,
        synonyms: [],
        antonyms: [],
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

function response(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('DictionaryGatewayClient', () => {
  it('encodes a normalized word in the shared gateway request', async () => {
    const fetchImpl = jest.fn(async () => response(gatewayResponse));
    const client = new DictionaryGatewayClient({
      baseUrl: 'https://gateway.example.com/',
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(client.lookupWord('  ice cream  ')).resolves.toEqual(
      expect.objectContaining({ lookup: expect.objectContaining({ word: 'ephemeral' }) }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://gateway.example.com/v1/dictionary/lookup?word=ice%20cream&locale=en',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('does not call the network when no secure gateway is configured', async () => {
    const fetchImpl = jest.fn();
    const client = new DictionaryGatewayClient({
      baseUrl: 'http://gateway.example.com',
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(client.lookupWord('ephemeral')).rejects.toMatchObject({
      code: 'not_configured',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('preserves a valid retry delay and does not invent one when absent', async () => {
    const withHeader = new DictionaryGatewayClient({
      baseUrl: 'https://gateway.example.com',
      fetchImpl: jest.fn(async () =>
        response({ message: 'Slow down.' }, 429, { 'retry-after': '30' }),
      ) as typeof fetch,
    });
    const withoutHeader = new DictionaryGatewayClient({
      baseUrl: 'https://gateway.example.com',
      fetchImpl: jest.fn(async () => response({ message: 'Slow down.' }, 429)) as typeof fetch,
    });

    await expect(withHeader.lookupWord('ephemeral')).rejects.toMatchObject({
      code: 'rate_limited',
      retryAfterSeconds: 30,
    });
    await expect(withoutHeader.lookupWord('ephemeral')).rejects.toMatchObject({
      retryAfterSeconds: null,
    });
  });
});
