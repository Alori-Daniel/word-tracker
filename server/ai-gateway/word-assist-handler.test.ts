import { createWordAssistHandler } from './word-assist-handler';

const suggestion = {
  word: 'Ephemeral',
  pronunciation: '',
  definition: 'Lasting for a very short time.',
  simpleDefinition: 'Not lasting long.',
  partOfSpeech: 'adjective',
  examples: ['The rainbow was ephemeral.'],
  synonyms: ['brief'],
  antonyms: ['lasting'],
  memoryTip: '',
  contextExplanation: '',
};

function request(body: unknown): Request {
  return {
    method: 'POST',
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  } as unknown as Request;
}

function providerResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'provider-request-1' },
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    authenticate: jest.fn(async () => ({ userId: 'user-1' })),
    authorize: jest.fn(async () => ({ allowed: true as const, remaining: 4 })),
    fetchImpl: jest.fn(async () =>
      providerResponse({
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: JSON.stringify(suggestion) }],
          },
        ],
      }),
    ) as typeof fetch,
    logger: { error: jest.fn(), warn: jest.fn() },
    model: 'configured-model',
    openAiApiKey: 'server-only-key',
    ...overrides,
  };
}

describe('word assist gateway handler', () => {
  it('authenticates, authorizes, and returns validated structured content', async () => {
    const deps = dependencies();
    const handler = createWordAssistHandler(deps);
    const response = await handler(
      request({ version: 1, word: 'Ephemeral', context: null, existingDefinition: null }),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ word: 'Ephemeral', memoryTip: null }),
        meta: expect.objectContaining({ provider: 'openai', remaining: 4 }),
      }),
    );
    expect(deps.fetchImpl).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer server-only-key' }),
      }),
    );
  });

  it('never calls OpenAI for an unauthenticated request', async () => {
    const deps = dependencies({ authenticate: jest.fn(async () => null) });
    const handler = createWordAssistHandler(deps);
    const response = await handler(request({ version: 1, word: 'Ephemeral' }));

    expect(response.status).toBe(401);
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it('never calls OpenAI when the premium authorization check fails', async () => {
    const deps = dependencies({
      authorize: jest.fn(async () => ({ allowed: false as const, reason: 'subscription' as const })),
    });
    const handler = createWordAssistHandler(deps);
    const response = await handler(request({ version: 1, word: 'Ephemeral' }));

    expect(response.status).toBe(403);
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });
});
