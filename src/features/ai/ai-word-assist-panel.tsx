import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { View } from 'react-native';

import { AppButton, AppText } from '@/components/ui';
import type { AiDictionaryGrounding, AiWordSuggestion } from '@/domain/ai';
import { AiGatewayError } from '@/services/ai';
import { createThemedStyles, useAppTheme } from '@/theme';

import { useAiAssist } from './ai-assist-provider';

type AiWordAssistPanelProps = {
  context: string;
  dictionaryGrounding: AiDictionaryGrounding | null;
  existingDefinition: string;
  onApply: (suggestion: AiWordSuggestion) => void;
  word: string;
};

export function AiWordAssistPanel({
  context,
  dictionaryGrounding,
  existingDefinition,
  onApply,
  word,
}: AiWordAssistPanelProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { generateWordSuggestion, isConfigured } = useAiAssist();
  const [suggestion, setSuggestion] = useState<AiWordSuggestion | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  async function generate() {
    if (!word.normalize('NFKC').trim()) {
      setErrorMessage('Enter a word first.');
      return;
    }

    setIsGenerating(true);
    setSuggestion(null);
    setErrorMessage(null);
    setHasApplied(false);

    try {
      const result = await generateWordSuggestion({
        word,
        context,
        dictionaryGrounding,
        existingDefinition,
      });
      setSuggestion(result.suggestion);
    } catch (error) {
      setErrorMessage(
        error instanceof AiGatewayError
          ? error.message
          : 'AI assistance is temporarily unavailable. Please try again.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function applySuggestion() {
    if (!suggestion) return;

    onApply(suggestion);
    setHasApplied(true);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.iconContainer}>
          <MaterialIcons
            color={theme.colors.brand.primary}
            name="auto-awesome"
            size={20}
          />
        </View>
        <View style={styles.headingCopy}>
          <View style={styles.titleRow}>
            <AppText variant="label">Prefill with AI</AppText>
            <View style={styles.premiumBadge}>
              <AppText style={styles.premiumLabel} variant="caption">
                Premium
              </AppText>
            </View>
          </View>
          <AppText tone="secondary" variant="caption">
            {dictionaryGrounding
              ? 'Personalize the selected meaning and draft optional learning details.'
              : 'Draft the meaning and optional dictionary-style details.'}
          </AppText>
        </View>
      </View>

      {!isConfigured ? (
        <AppText tone="tertiary" variant="caption">
          AI assistance isn&apos;t available in this build yet.
        </AppText>
      ) : null}

      <AppButton
        disabled={!isConfigured}
        label={dictionaryGrounding ? 'Personalize with AI' : 'Prefill word details'}
        leftAccessory={
          <MaterialIcons
            color={theme.colors.brand.primary}
            name="auto-awesome"
            size={18}
          />
        }
        loading={isGenerating}
        onPress={() => void generate()}
        variant="secondary"
      />

      {errorMessage ? (
        <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
          {errorMessage}
        </AppText>
      ) : null}

      {suggestion ? (
        <View style={styles.preview}>
          <View style={styles.previewHeading}>
            <AppText variant="subtitle">Suggested content</AppText>
            <AppText tone="secondary" variant="caption">
              AI can be inaccurate. Check every field before saving.
            </AppText>
          </View>

          <SuggestionField label="Definition" value={suggestion.definition} />
          <SuggestionField label="Simple definition" value={suggestion.simpleDefinition} />
          {suggestion.pronunciation ? (
            <SuggestionField label="Pronunciation" value={suggestion.pronunciation} />
          ) : null}
          {suggestion.partOfSpeech ? (
            <SuggestionField label="Part of speech" value={suggestion.partOfSpeech} />
          ) : null}
          <SuggestionList label="Examples" values={suggestion.examples} />
          <SuggestionList label="Synonyms" values={suggestion.synonyms} />
          <SuggestionList label="Antonyms" values={suggestion.antonyms} />
          {suggestion.memoryTip ? (
            <SuggestionField label="Memory tip" value={suggestion.memoryTip} />
          ) : null}
          {suggestion.contextExplanation ? (
            <SuggestionField
              label="Context explanation"
              value={suggestion.contextExplanation}
            />
          ) : null}

          <AppButton
            label={hasApplied ? 'Applied to form' : 'Apply to form'}
            disabled={hasApplied}
            onPress={applySuggestion}
          />
        </View>
      ) : null}
    </View>
  );
}

function SuggestionField({ label, value }: { label: string; value: string }) {
  const styles = useStyles();

  return (
    <View style={styles.suggestionField}>
      <AppText tone="secondary" variant="caption">
        {label}
      </AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

function SuggestionList({ label, values }: { label: string; values: readonly string[] }) {
  if (!values.length) return null;

  return <SuggestionField label={label} value={values.join(' • ')} />;
}

const useStyles = createThemedStyles((theme) => ({
  container: {
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headingCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  premiumBadge: {
    backgroundColor: theme.colors.semantic.info.background,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
  },
  premiumLabel: {
    color: theme.colors.semantic.info.foreground,
  },
  preview: {
    backgroundColor: theme.colors.background.muted,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  previewHeading: {
    gap: theme.spacing.xxs,
  },
  suggestionField: {
    gap: theme.spacing.xxs,
  },
  errorText: {
    color: theme.colors.semantic.error.foreground,
  },
}));
