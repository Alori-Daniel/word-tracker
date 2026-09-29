import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";

import type { DictionaryLookupResult } from "@/domain/dictionary";
import { DictionaryGatewayClient } from "@/services/dictionary";
import { configuredGatewayUrl } from "@/services/gateway";

type DictionaryLookupContextValue = {
  isConfigured: boolean;
  lookupWord: (word: string) => Promise<DictionaryLookupResult>;
};

type DictionaryLookupProviderProps = PropsWithChildren<{
  baseUrl?: string | null;
}>;

const DictionaryLookupContext =
  createContext<DictionaryLookupContextValue | null>(null);

export function DictionaryLookupProvider({
  baseUrl = configuredGatewayUrl,
  children,
}: DictionaryLookupProviderProps) {
  const client = useMemo(
    () => new DictionaryGatewayClient({ baseUrl }),
    [baseUrl],
  );
  const value = useMemo<DictionaryLookupContextValue>(
    () => ({
      isConfigured: client.isConfigured,
      lookupWord: (word) => client.lookupWord(word),
    }),
    [client],
  );

  return (
    <DictionaryLookupContext.Provider value={value}>
      {children}
    </DictionaryLookupContext.Provider>
  );
}

export function useDictionaryLookup(): DictionaryLookupContextValue {
  const context = useContext(DictionaryLookupContext);

  if (!context) {
    throw new Error(
      "useDictionaryLookup must be used within DictionaryLookupProvider.",
    );
  }

  return context;
}
