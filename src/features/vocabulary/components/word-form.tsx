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
import { createThemedStyles, useAppTheme } from '@/theme';

import { useVocabulary } from '../vocabulary-provider';
import {
  EMPTY_WORD_FORM_VALUES,
  toWordInput,
  type WordFormValues,
} from '../word-form-values';

type WordFormProps = {
  initialValues?: WordFormValues;
  onSubmit: (input: CreateWordInput) => Promise<void>;
  quickSubmitLabel?: string;
  resetOnSuccess?: boolean;
  submitLabel: string;
};

export function WordForm({
  initialValues = EMPTY_WORD_FORM_VALUES,
  onSubmit,
  quickSubmitLabel,
  resetOnSuccess = false,
  submitLabel,
}: WordFormProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { categories } = useVocabulary();
  const [values, setValues] = useState(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateValue<Key extends keyof WordFormValues>(key: Key, value: WordFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!values.word.normalize('NFKC').trim()) {
      setErrorMessage('Enter the word you want to save.');
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
        <AppText variant="subtitle">Word</AppText>
        <FormTextField
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={!initialValues.word}
          label="Word"
          maxLength={120}
          onChangeText={(value) => updateValue('word', value)}
          placeholder="e.g. ephemeral"
          value={values.word}
        />
        {quickSubmitLabel ? (
          <AppButton
            label={quickSubmitLabel}
            loading={isSaving}
            onPress={() => void submit()}
            variant="secondary"
          />
        ) : null}
        <FormTextField
          autoCapitalize="none"
          label="Pronunciation"
          maxLength={160}
          onChangeText={(value) => updateValue('pronunciation', value)}
          placeholder="e.g. ih-FEM-er-uhl"
          value={values.pronunciation}
        />
        <FormTextField
          label="Definition"
          multiline
          onChangeText={(value) => updateValue('definition', value)}
          placeholder="What does it mean?"
          value={values.definition}
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
      </Card>

      <Card style={styles.section}>
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
      </Card>

      <Card style={styles.section}>
        <AppText variant="subtitle">Language connections</AppText>
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
      </Card>

      <Card style={styles.section}>
        <AppText variant="subtitle">Context</AppText>
        <FormTextField
          label="Where did you find it?"
          maxLength={160}
          onChangeText={(value) => updateValue('source', value)}
          placeholder="Book, article, conversation…"
          value={values.source}
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
};

function FormTextField({ label, multiline = false, style, ...props }: FormTextFieldProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
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
  manageLink: {
    color: theme.colors.brand.primary,
  },
  field: {
    gap: theme.spacing.xs,
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
  errorText: {
    color: theme.colors.semantic.error.foreground,
    textAlign: 'center',
  },
}));
