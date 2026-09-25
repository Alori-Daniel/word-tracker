import type { DictionaryAttribution } from '@/domain/dictionary';
import type { CreateWordInput, LearningStatus, VocabularyWord } from '@/domain/vocabulary';

export type WordFormValues = {
  antonyms: string;
  categoryId: string | null;
  definition: string;
  definitionAttribution: DictionaryAttribution | null;
  examples: string;
  isFavorite: boolean;
  partOfSpeech: string;
  personalNotes: string;
  pronunciation: string;
  simpleDefinition: string;
  source: string;
  sourceSentence: string;
  status: LearningStatus;
  synonyms: string;
  word: string;
};

export const EMPTY_WORD_FORM_VALUES: WordFormValues = {
  antonyms: '',
  categoryId: null,
  definition: '',
  definitionAttribution: null,
  examples: '',
  isFavorite: false,
  partOfSpeech: '',
  personalNotes: '',
  pronunciation: '',
  simpleDefinition: '',
  source: '',
  sourceSentence: '',
  status: 'learning',
  synonyms: '',
  word: '',
};

export function getWordFormValidationError(values: WordFormValues): string | null {
  if (!values.word.normalize('NFKC').trim()) {
    return 'Enter the word you want to save.';
  }

  if (!values.definition.normalize('NFKC').trim()) {
    return 'Add a meaning for this word.';
  }

  return null;
}

function splitList(value: string, separator: RegExp): string[] {
  return value
    .split(separator)
    .map((item) => item.normalize('NFKC').trim())
    .filter(Boolean);
}

export function toWordInput(values: WordFormValues): CreateWordInput {
  return {
    word: values.word,
    pronunciation: values.pronunciation,
    definition: values.definition,
    definitionAttribution: values.definitionAttribution,
    simpleDefinition: values.simpleDefinition,
    partOfSpeech: values.partOfSpeech,
    examples: splitList(values.examples, /\n+/),
    synonyms: splitList(values.synonyms, /[,;\n]+/),
    antonyms: splitList(values.antonyms, /[,;\n]+/),
    personalNotes: values.personalNotes,
    source: values.source,
    sourceSentence: values.sourceSentence,
    categoryId: values.categoryId,
    status: values.status,
    isFavorite: values.isFavorite,
  };
}

export function valuesFromWord(word: VocabularyWord): WordFormValues {
  return {
    antonyms: word.antonyms.join(', '),
    categoryId: word.categoryId,
    definition: word.definition,
    definitionAttribution: word.definitionAttribution,
    examples: word.examples.join('\n'),
    isFavorite: word.isFavorite,
    partOfSpeech: word.partOfSpeech ?? '',
    personalNotes: word.personalNotes ?? '',
    pronunciation: word.pronunciation ?? '',
    simpleDefinition: word.simpleDefinition ?? '',
    source: word.source ?? '',
    sourceSentence: word.sourceSentence ?? '',
    status: word.status,
    synonyms: word.synonyms.join(', '),
    word: word.word,
  };
}
