import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from 'react';

import type { AiWordAssistRequest, AiWordAssistResult } from '@/domain/ai';
import { AiGatewayClient } from '@/services/ai';

type AiAssistContextValue = {
  generateWordSuggestion: (input: AiWordAssistRequest) => Promise<AiWordAssistResult>;
  isConfigured: boolean;
};

type AiAssistProviderProps = PropsWithChildren<{
  baseUrl?: string | null;
  getAccessToken?: () => Promise<string | null>;
}>;

const AiAssistContext = createContext<AiAssistContextValue | null>(null);
const configuredGatewayUrl = process.env.EXPO_PUBLIC_AI_GATEWAY_URL;

export function AiAssistProvider({
  baseUrl = configuredGatewayUrl,
  children,
  getAccessToken,
}: AiAssistProviderProps) {
  const client = useMemo(
    () => new AiGatewayClient({ baseUrl, getAccessToken }),
    [baseUrl, getAccessToken],
  );
  const value = useMemo<AiAssistContextValue>(
    () => ({
      generateWordSuggestion: (input) => client.generateWordSuggestion(input),
      isConfigured: client.isConfigured,
    }),
    [client],
  );

  return <AiAssistContext.Provider value={value}>{children}</AiAssistContext.Provider>;
}

export function useAiAssist(): AiAssistContextValue {
  const context = useContext(AiAssistContext);

  if (!context) {
    throw new Error('useAiAssist must be used within AiAssistProvider.');
  }

  return context;
}
