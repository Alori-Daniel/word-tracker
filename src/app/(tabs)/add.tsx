import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { AppText, Screen } from '@/components/ui';
import type { CreateWordInput } from '@/domain/vocabulary';
import { useVocabulary, WordForm } from '@/features/vocabulary';
import { createThemedStyles } from '@/theme';

export default function AddScreen() {
  const styles = useStyles();
  const { createWord } = useVocabulary();

  async function saveWord(input: CreateWordInput) {
    const word = await createWord(input);
    router.push({ pathname: '/word/[id]', params: { id: word.id } });
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppText tone="tertiary" variant="caption">QUICK CAPTURE</AppText>
          <AppText style={styles.title} variant="editorial">Save a word</AppText>
          <AppText style={styles.description} tone="secondary">
            Capture the word and meaning now. Everything else can wait.
          </AppText>
          <WordForm onSubmit={saveWord} resetOnSuccess submitLabel="Save word" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const useStyles = createThemedStyles((theme) => ({
  flex: {
    flex: 1,
  },
  content: {
    gap: theme.spacing.md,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    width: '100%',
  },
  title: {
    fontSize: 38,
    lineHeight: 44,
  },
  description: {
    lineHeight: 25,
    marginBottom: theme.spacing.md,
  },
}));
