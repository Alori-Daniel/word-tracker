import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { AppText, NavigationHeader, Screen } from '@/components/ui';
import type { CreateWordInput, VocabularyWord } from '@/domain/vocabulary';
import { useVocabulary, valuesFromWord, WordForm } from '@/features/vocabulary';
import { createThemedStyles, useAppTheme } from '@/theme';

export default function EditWordScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getWord, updateWord } = useVocabulary();
  const [word, setWord] = useState<VocabularyWord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    void getWord(id)
      .then((nextWord) => {
        if (isActive) {
          setWord(nextWord);
        }
      })
      .catch(() => {
        if (isActive) {
          setWord(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [getWord, id]);

  async function saveChanges(input: CreateWordInput) {
    const updated = await updateWord(id, input);

    if (!updated) {
      throw new Error('The word no longer exists.');
    }

    router.back();
  }

  return (
    <Screen edges={['top', 'right', 'bottom', 'left']}>
      <NavigationHeader onBack={() => router.back()} title="Edit word" />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.brand.primary} size="large" />
        </View>
      ) : word ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <WordForm
              initialValues={valuesFromWord(word)}
              onSubmit={saveChanges}
              submitLabel="Save changes"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.centered}>
          <AppText variant="subtitle">This word is no longer available.</AppText>
        </View>
      )}
    </Screen>
  );
}

const useStyles = createThemedStyles((theme) => ({
  flex: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    width: '100%',
  },
}));
