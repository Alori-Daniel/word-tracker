import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { PageHeader, Screen } from '@/components/ui';
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
          <PageHeader
            description="Only the word is required. Add as much context as you want."
            eyebrow="Quick capture"
            title="Add a word"
          />
          <WordForm
            onSubmit={saveWord}
            quickSubmitLabel="Quick save word"
            resetOnSuccess
            submitLabel="Save to my vault"
          />
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
    gap: theme.spacing.xl,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    width: '100%',
  },
}));
