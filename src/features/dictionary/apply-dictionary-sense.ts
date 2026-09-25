import type { AiDictionaryGrounding } from '@/domain/ai';
import type { DictionarySenseSelection } from '@/domain/dictionary';
import type { WordFormValues } from '@/features/vocabulary/word-form-values';

export function applyDictionarySenseToWordForm(
  current: WordFormValues,
  { lookup, sense }: DictionarySenseSelection,
): WordFormValues {
  return {
    ...current,
    definition: sense.definition,
    definitionAttribution: lookup.attribution,
    pronunciation: lookup.pronunciation ?? current.pronunciation,
    partOfSpeech: sense.partOfSpeech ?? current.partOfSpeech,
    examples: sense.example ?? current.examples,
    synonyms: sense.synonyms.length ? sense.synonyms.join(', ') : current.synonyms,
    antonyms: sense.antonyms.length ? sense.antonyms.join(', ') : current.antonyms,
  };
}

export function toAiDictionaryGrounding({
  lookup,
  sense,
}: DictionarySenseSelection): AiDictionaryGrounding {
  return {
    definition: sense.definition,
    partOfSpeech: sense.partOfSpeech,
    example: sense.example,
    sourceName: lookup.attribution.providerName,
  };
}
