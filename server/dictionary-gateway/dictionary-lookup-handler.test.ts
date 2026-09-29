import { createDictionaryLookupHandler } from './dictionary-lookup-handler';

const providerBody = [
  {
    word: 'ephemeral',
    tags: ['query', 'adj', 'ipa_pron:ɪfˈɛmɝʌɫ'],
    defs: ['adj\tLasting for a very short time.'],
  },
];

const cachedLookup = {
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
    providerName: 'Datamuse',
    providerUrl: 'https://www.datamuse.com/api/',
    sourceUrl: null,
    licenseName: null,
    licenseUrl: null,
  },
};

function request(word = 'ephemeral'): Request {
  return {
    method: 'GET',
    url: `https://gateway.example.com/v1/dictionary/lookup?word=${word}&locale=en`,
  } as Request;
}

function providerResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    cache: {
      get: jest.fn(async () => null),
      set: jest.fn(async () => undefined),
    },
    checkRateLimit: jest.fn(async () => ({ allowed: true as const })),
    fetchImpl: jest.fn(async () => providerResponse(providerBody)) as typeof fetch,
    logger: { error: jest.fn(), warn: jest.fn() },
    ...overrides,
  };
}

describe('dictionary lookup gateway handler', () => {
  it('supports anonymous lookup, normalizes the provider response, and caches it', async () => {
    const deps = dependencies();
    const handler = createDictionaryLookupHandler(deps);
    const response = await handler(request());
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          word: 'ephemeral',
          senses: [expect.objectContaining({ partOfSpeech: 'adjective' })],
        }),
        meta: expect.objectContaining({ cached: false }),
      }),
    );
    expect(deps.fetchImpl).toHaveBeenCalledWith(
      'https://api.datamuse.com/words?sp=ephemeral&qe=sp&md=dpr&ipa=1&max=10',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(deps.cache.set).toHaveBeenCalledWith(
      'datamuse-v1:en:ephemeral',
      expect.objectContaining({ word: 'ephemeral' }),
      86_400,
    );
  });

  it('returns a valid cached response without calling the provider', async () => {
    const cache = {
      get: jest.fn(async () => cachedLookup),
      set: jest.fn(async () => undefined),
    };
    const deps = dependencies({ cache });
    const handler = createDictionaryLookupHandler(deps);
    const response = await handler(request('Ephemeral'));
    const body = (await response.json()) as { meta: { cached: boolean } };

    expect(response.status).toBe(200);
    expect(body.meta.cached).toBe(true);
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it('rate-limits before making a provider request', async () => {
    const deps = dependencies({
      checkRateLimit: jest.fn(async () => ({ allowed: false as const, retryAfterSeconds: 60 })),
    });
    const handler = createDictionaryLookupHandler(deps);
    const response = await handler(request());

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(deps.cache.get).not.toHaveBeenCalled();
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it('maps provider misses to a stable not-found response', async () => {
    const deps = dependencies({
      fetchImpl: jest.fn(async () =>
        providerResponse([{ word: 'unknown', tags: ['query'] }]),
      ) as typeof fetch,
    });
    const handler = createDictionaryLookupHandler(deps);
    const response = await handler(request());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ code: 'not_found' }),
    );
  });
});
