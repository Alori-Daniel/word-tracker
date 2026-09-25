import { AiGatewayClient } from './ai-gateway-client';
import { AiGatewayError } from './ai-gateway-error';

const gatewayResponse = {
  data: {
    word: 'Ephemeral',
    pronunciation: null,
    definition: 'Lasting for a very short time.',
    simpleDefinition: 'Not lasting long.',
    partOfSpeech: 'adjective',
    examples: ['The rainbow was ephemeral.'],
    synonyms: ['brief'],
    antonyms: ['lasting'],
    memoryTip: null,
    contextExplanation: null,
  },
  meta: {
    requestId: 'request-1',
    provider: 'openai',
    model: 'configured-model',
    remaining: 3,
  },
};

function mockResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('AiGatewayClient', () => {
  it('sends only the gateway contract and an optional account token', async () => {
    const fetchImpl = jest.fn(
      async (..._args: Parameters<typeof fetch>) => mockResponse(gatewayResponse),
    );
    const client = new AiGatewayClient({
      baseUrl: 'https://gateway.example.com/',
      fetchImpl: fetchImpl as typeof fetch,
      getAccessToken: async () => 'account-token',
    });

    await expect(
      client.generateWordSuggestion({
        word: '  Ephemeral  ',
        context: 'A fleeting moment.',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        suggestion: expect.objectContaining({ word: 'Ephemeral' }),
      }),
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://gateway.example.com/v1/word-assist');
    expect(options).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer account-token' }),
      }),
    );
    expect(JSON.parse(String(options?.body))).toEqual(
      expect.objectContaining({ version: 1, word: 'Ephemeral', locale: 'en' }),
    );
  });

  it('fails locally when no secure gateway is configured', async () => {
    const fetchImpl = jest.fn();
    const client = new AiGatewayClient({
      baseUrl: 'http://not-secure.example.com',
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(client.generateWordSuggestion({ word: 'ephemeral' })).rejects.toMatchObject({
      code: 'not_configured',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'unauthenticated'],
    [403, 'upgrade_required'],
    [429, 'rate_limited'],
    [503, 'unavailable'],
  ])('maps HTTP %s to %s', async (status, code) => {
    const client = new AiGatewayClient({
      baseUrl: 'https://gateway.example.com',
      fetchImpl: jest.fn(async () =>
        mockResponse({ message: 'Safe gateway message.' }, status),
      ) as typeof fetch,
    });

    const request = client.generateWordSuggestion({ word: 'ephemeral' });

    await expect(request).rejects.toBeInstanceOf(AiGatewayError);
    await expect(request).rejects.toMatchObject({ code, status });
  });
});
