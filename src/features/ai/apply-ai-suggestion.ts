import type { AiWordSuggestion } from '@/domain/ai';
import type { WordFormValues } from '@/features/vocabulary/word-form-values';

function appendGeneratedNotes(
  currentNotes: string,
  suggestion: Pick<AiWordSuggestion, 'contextExplanation' | 'memoryTip'>,
): string {
  const sections = [
    currentNotes.normalize('NFKC').trim(),
    suggestion.memoryTip ? `Memory tip: ${suggestion.memoryTip}` : '',
    suggestion.contextExplanation
      ? `Context explanation: ${suggestion.contextExplanation}`
      : '',
  ].filter(Boolean);

  return [...new Set(sections)].join('\n\n');
}

export function applyAiSuggestionToWordForm(
  current: WordFormValues,
  suggestion: AiWordSuggestion,
): WordFormValues {
  return {
    ...current,
    pronunciation: suggestion.pronunciation ?? current.pronunciation,
    definition: suggestion.definition,
    simpleDefinition: suggestion.simpleDefinition,
    partOfSpeech: suggestion.partOfSpeech ?? current.partOfSpeech,
    examples: suggestion.examples.join('\n'),
    synonyms: suggestion.synonyms.join(', '),
    antonyms: suggestion.antonyms.join(', '),
    personalNotes: appendGeneratedNotes(current.personalNotes, suggestion),
  };
}
