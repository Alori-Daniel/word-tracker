import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { AppButton, AppText, Card } from '@/components/ui';
import { DuplicateWordError } from '@/data';
import { LEARNING_STATUSES, type CreateWordInput } from '@/domain/vocabulary';
import { applyDictionarySenseToWordForm, DictionaryLookupPanel } from '@/features/dictionary';
import { createThemedStyles, useAppTheme } from '@/theme';

import { useVocabulary } from '../vocabulary-provider';
import {
  EMPTY_WORD_FORM_VALUES,
  getWordFormValidationError,
  toWordInput,
  type WordFormValues,
} from '../word-form-values';

type WordFormProps = {
  initialValues?: WordFormValues;
  onSubmit: (input: CreateWordInput) => Promise<void>;
  resetOnSuccess?: boolean;
  submitLabel: string;
};

export function WordForm({
  initialValues = EMPTY_WORD_FORM_VALUES,
  onSubmit,
  resetOnSuccess = false,
  submitLabel,
}: WordFormProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { categories } = useVocabulary();
  const [values, setValues] = useState(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(() => hasAdvancedDetails(initialValues));

  function updateValue<Key extends keyof WordFormValues>(key: Key, value: WordFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    const validationError = getWordFormValidationError(values);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSubmit(toWordInput(values));

      if (resetOnSuccess) {
        setValues(EMPTY_WORD_FORM_VALUES);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof DuplicateWordError
          ? error.message
          : 'The word could not be saved. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <Card style={styles.section}>
        <View style={styles.sectionHeadingCopy}>
          <AppText variant="subtitle">Quick add</AppText>
          <AppText tone="secondary" variant="caption">
            Only the word and meaning are required.
          </AppText>
        </View>
        <FormTextField
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={!initialValues.word}
          label="Word"
          maxLength={120}
          onChangeText={(value) => {
            setValues((current) => ({
              ...current,
              word: value,
              definitionAttribution: null,
            }));
          }}
          placeholder="e.g. ephemeral"
          required
          value={values.word}
        />
        <DictionaryLookupPanel
          key={`dictionary:${values.word}`}
          onSelect={(selection) =>
            setValues((current) => applyDictionarySenseToWordForm(current, selection))
          }
          word={values.word}
        />
        <FormTextField
          label="Meaning"
          multiline
          onChangeText={(value) => {
            setValues((current) => ({
              ...current,
              definition: value,
              definitionAttribution: null,
            }));
          }}
          placeholder="What does this word mean?"
          required
          value={values.definition}
        />
        {values.definitionAttribution ? (
          <AppText tone="tertiary" variant="caption">
            Definition from {values.definitionAttribution.providerName}
            {values.definitionAttribution.licenseName
              ? ` · ${values.definitionAttribution.licenseName}`
              : ''}
          </AppText>
        ) : null}
      </Card>

      <Card style={styles.section}>
        <AppText variant="subtitle">Learning status</AppText>
        <View style={styles.wrappedChoices}>
          {LEARNING_STATUSES.map((status) => (
            <ChoiceChip
              key={status}
              label={status[0].toUpperCase() + status.slice(1)}
              onPress={() => updateValue('status', status)}
              selected={values.status === status}
            />
          ))}
        </View>

        <View style={styles.sectionDivider} />

        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingCopy}>
            <AppText variant="subtitle">Category</AppText>
            <AppText tone="secondary" variant="caption">
              Optional
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/categories')}
          >
            <AppText style={styles.manageLink} variant="label">
              Manage
            </AppText>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.choiceRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <ChoiceChip
            label="None"
            onPress={() => updateValue('categoryId', null)}
            selected={values.categoryId === null}
          />
          {categories.map((category) => (
            <ChoiceChip
              color={category.color}
              key={category.id}
              label={category.name}
              onPress={() => updateValue('categoryId', category.id)}
              selected={values.categoryId === category.id}
            />
          ))}
        </ScrollView>

        <View style={styles.sectionDivider} />

        <FormTextField
          label="Where did you find it? (optional)"
          maxLength={160}
          onChangeText={(value) => updateValue('source', value)}
          placeholder="Book, article, conversation…"
          value={values.source}
        />
      </Card>

      <Card style={styles.section}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showMoreDetails }}
          onPress={() => setShowMoreDetails((current) => !current)}
          style={styles.moreDetailsButton}
        >
          <View style={styles.moreDetailsCopy}>
            <AppText variant="subtitle">More details</AppText>
            <AppText tone="secondary" variant="caption">
              Pronunciation, examples, related words and notes
            </AppText>
          </View>
          <MaterialIcons
            color={theme.colors.content.secondary}
            name={showMoreDetails ? 'expand-less' : 'expand-more'}
            size={24}
          />
        </Pressable>

        {showMoreDetails ? (
          <View style={styles.advancedFields}>
            <FormTextField
              autoCapitalize="none"
              label="Pronunciation"
              maxLength={160}
              onChangeText={(value) => updateValue('pronunciation', value)}
              placeholder="e.g. ih-FEM-er-uhl"
              value={values.pronunciation}
            />
            <FormTextField
              label="Simple definition"
              multiline
              onChangeText={(value) => updateValue('simpleDefinition', value)}
              placeholder="Explain it in your own words"
              value={values.simpleDefinition}
            />
            <FormTextField
              autoCapitalize="none"
              label="Part of speech"
              maxLength={80}
              onChangeText={(value) => updateValue('partOfSpeech', value)}
              placeholder="noun, verb, adjective…"
              value={values.partOfSpeech}
            />
            <FormTextField
              label="Example sentences"
              multiline
              onChangeText={(value) => updateValue('examples', value)}
              placeholder="One example per line"
              value={values.examples}
            />
            <FormTextField
              label="Synonyms"
              multiline
              onChangeText={(value) => updateValue('synonyms', value)}
              placeholder="Separate with commas"
              value={values.synonyms}
            />
            <FormTextField
              label="Antonyms"
              multiline
              onChangeText={(value) => updateValue('antonyms', value)}
              placeholder="Separate with commas"
              value={values.antonyms}
            />
            <FormTextField
              label="Original sentence"
              multiline
              onChangeText={(value) => updateValue('sourceSentence', value)}
              placeholder="The sentence where the word appeared"
              value={values.sourceSentence}
            />
            <FormTextField
              label="Personal notes"
              multiline
              onChangeText={(value) => updateValue('personalNotes', value)}
              placeholder="A memory trick or anything useful"
              value={values.personalNotes}
            />
            <View style={styles.favoriteRow}>
              <View style={styles.favoriteCopy}>
                <AppText variant="label">Favourite</AppText>
                <AppText tone="secondary" variant="caption">
                  Keep this word easy to find.
                </AppText>
              </View>
              <Switch
                accessibilityLabel="Favourite word"
                onValueChange={(value) => updateValue('isFavorite', value)}
                thumbColor={theme.colors.background.surface}
                trackColor={{
                  false: theme.colors.border.default,
                  true: theme.colors.brand.primary,
                }}
                value={values.isFavorite}
              />
            </View>
          </View>
        ) : null}
      </Card>

      {errorMessage ? (
        <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
          {errorMessage}
        </AppText>
      ) : null}

      <AppButton label={submitLabel} loading={isSaving} onPress={() => void submit()} />
    </View>
  );
}

type FormTextFieldProps = TextInputProps & {
  label: string;
  required?: boolean;
};

function FormTextField({
  label,
  multiline = false,
  required = false,
  style,
  ...props
}: FormTextFieldProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <AppText variant="label">{label}</AppText>
        {required ? (
          <AppText style={styles.requiredLabel} variant="caption">
            Required
          </AppText>
        ) : null}
      </View>
      <TextInput
        multiline={multiline}
        placeholderTextColor={theme.colors.content.tertiary}
        selectionColor={theme.colors.brand.primary}
        style={[styles.input, multiline && styles.multilineInput, style]}
        {...props}
      />
    </View>
  );
}

function hasAdvancedDetails(values: WordFormValues): boolean {
  return Boolean(
    values.pronunciation.trim() ||
      values.simpleDefinition.trim() ||
      values.partOfSpeech.trim() ||
      values.examples.trim() ||
      values.synonyms.trim() ||
      values.antonyms.trim() ||
      values.sourceSentence.trim() ||
      values.personalNotes.trim() ||
      values.isFavorite,
  );
}

function ChoiceChip({
  color,
  label,
  onPress,
  selected,
}: {
  color?: string;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      {color ? <View style={[styles.categoryDot, { backgroundColor: color }]} /> : null}
      <AppText style={selected && styles.choiceSelectedText} variant="label">
        {label}
      </AppText>
      {selected ? (
        <MaterialIcons color={theme.colors.brand.primary} name="check" size={17} />
      ) : null}
    </Pressable>
  );
}

const useStyles = createThemedStyles((theme) => ({
  form: {
    gap: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeadingCopy: {
    gap: theme.spacing.xxs,
  },
  sectionDivider: {
    backgroundColor: theme.colors.border.subtle,
    height: 1,
  },
  manageLink: {
    color: theme.colors.brand.primary,
  },
  field: {
    gap: theme.spacing.xs,
  },
  fieldLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requiredLabel: {
    color: theme.colors.content.tertiary,
  },
  input: {
    backgroundColor: theme.colors.background.muted,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.content.primary,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  choiceRow: {
    gap: theme.spacing.xs,
    paddingRight: theme.spacing.md,
  },
  wrappedChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  choice: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.muted,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
  },
  choiceSelected: {
    backgroundColor: theme.colors.brand.soft,
    borderColor: theme.colors.brand.primary,
  },
  choiceSelectedText: {
    color: theme.colors.brand.primary,
  },
  categoryDot: {
    borderRadius: theme.radius.pill,
    height: 9,
    width: 9,
  },
  favoriteRow: {
    alignItems: 'center',
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.md,
  },
  favoriteCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  moreDetailsButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  moreDetailsCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
    paddingRight: theme.spacing.md,
  },
  advancedFields: {
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.semantic.error.foreground,
    textAlign: 'center',
  },
}));
