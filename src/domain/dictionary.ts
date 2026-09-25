export const DICTIONARY_GATEWAY_API_VERSION = 1 as const;

export type DictionaryAttribution = {
  providerName: string;
  providerUrl: string;
  sourceUrl: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
};

export type DictionarySense = {
  id: string;
  definition: string;
  partOfSpeech: string | null;
  example: string | null;
  synonyms: string[];
  antonyms: string[];
};

export type DictionaryLookup = {
  word: string;
  pronunciation: string | null;
  audioUrl: string | null;
  senses: DictionarySense[];
  attribution: DictionaryAttribution;
};

export type DictionaryLookupMetadata = {
  requestId: string | null;
  cached: boolean;
};

export type DictionaryLookupResult = {
  lookup: DictionaryLookup;
  metadata: DictionaryLookupMetadata;
};

export type DictionarySenseSelection = {
  lookup: DictionaryLookup;
  sense: DictionarySense;
};

export type DictionaryGatewayErrorCode =
  | 'not_configured'
  | 'invalid_request'
  | 'not_found'
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'unavailable'
  | 'invalid_response';
