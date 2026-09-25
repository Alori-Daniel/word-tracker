import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';

import {
  AppButton,
  AppText,
  Card,
  EmptyState,
  NavigationHeader,
  Screen,
} from '@/components/ui';
import type { VocabularyWord } from '@/domain/vocabulary';
import { useVocabulary } from '@/features/vocabulary';
import { createThemedStyles, useAppTheme } from '@/theme';

export default function WordDetailScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { categories, deleteWord, getWord, revision, updateWord } = useVocabulary();
  const [word, setWord] = useState<VocabularyWord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let isActive = true;

    void getWord(id)
      .then((nextWord) => {
        if (isActive) {
          setWord(nextWord);
          setLoadFailed(false);
        }
      })
      .catch(() => {
        if (isActive) {
          setLoadFailed(true);
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
  }, [getWord, id, revision]);

  const category = useMemo(
    () => categories.find((item) => item.id === word?.categoryId),
    [categories, word?.categoryId],
  );

  async function toggleFavorite() {
    if (!word || isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      const updated = await updateWord(word.id, { isFavorite: !word.isFavorite });
      setWord(updated);
    } catch {
      Alert.alert('Could not update favourite', 'Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }

  function confirmDelete() {
    if (!word) {
      return;
    }

    Alert.alert(
      'Delete this word?',
      `“${word.word}” will be removed from your local vault.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteWord(word.id)
              .then(() => router.replace('/(tabs)/library'))
              .catch(() => Alert.alert('Could not delete word', 'Please try again.'));
          },
        },
      ],
    );
  }

  const headerActions = word ? (
    <View style={styles.headerActions}>
      <Pressable
        accessibilityLabel={word.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
        accessibilityRole="button"
        disabled={isUpdating}
        hitSlop={8}
        onPress={() => void toggleFavorite()}
      >
        <MaterialIcons
          color={word.isFavorite ? theme.colors.brand.primary : theme.colors.content.secondary}
          name={word.isFavorite ? 'star' : 'star-border'}
          size={25}
        />
      </Pressable>
      <Pressable
        accessibilityLabel="Edit word"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() =>
          router.push({ pathname: '/word/[id]/edit', params: { id: word.id } })
        }
      >
        <MaterialIcons color={theme.colors.content.primary} name="edit" size={23} />
      </Pressable>
    </View>
  ) : undefined;

  return (
    <Screen edges={['top', 'right', 'bottom', 'left']}>
      <NavigationHeader onBack={() => router.back()} rightAccessory={headerActions} title="Word details" />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.brand.primary} size="large" />
        </View>
      ) : !word ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            actionLabel={loadFailed ? 'Return to library' : 'Browse library'}
            description={
              loadFailed
                ? 'The local vault could not load this word.'
                : 'This word may have been deleted or the link is no longer valid.'
            }
            icon={loadFailed ? 'error-outline' : 'find-in-page'}
            onAction={() => router.replace('/(tabs)/library')}
            title={loadFailed ? 'Could not open word' : 'Word not found'}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroTitleRow}>
              <AppText style={styles.word} variant="display">
                {word.word}
              </AppText>
              {word.partOfSpeech ? (
                <AppText style={styles.partOfSpeech} variant="caption">
                  {word.partOfSpeech}
                </AppText>
              ) : null}
            </View>
            {word.pronunciation ? (
              <AppText tone="secondary">{word.pronunciation}</AppText>
            ) : null}
            <View style={styles.metaRow}>
              <View style={[styles.status, styles[word.status]]}>
                <AppText style={styles[`${word.status}Text`]} variant="caption">
                  {word.status[0].toUpperCase() + word.status.slice(1)}
                </AppText>
              </View>
              {category ? (
                <View style={styles.category}>
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <AppText tone="secondary" variant="caption">
                    {category.name}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>

          <DetailSection title="Definition">
            <AppText>{word.definition || 'No definition added yet.'}</AppText>
            {word.simpleDefinition ? (
              <View style={styles.simpleDefinition}>
                <AppText tone="tertiary" variant="caption">
                  IN SIMPLE WORDS
                </AppText>
                <AppText>{word.simpleDefinition}</AppText>
              </View>
            ) : null}
          </DetailSection>

          {word.examples.length > 0 ? (
            <DetailSection title="Examples">
              {word.examples.map((example, index) => (
                <View key={`${example}-${index}`} style={styles.bulletRow}>
                  <AppText style={styles.bullet}>•</AppText>
                  <AppText style={styles.bulletCopy}>{example}</AppText>
                </View>
              ))}
            </DetailSection>
          ) : null}

          {word.synonyms.length > 0 || word.antonyms.length > 0 ? (
            <DetailSection title="Related words">
              {word.synonyms.length > 0 ? (
                <WordTags label="Synonyms" values={word.synonyms} />
              ) : null}
              {word.antonyms.length > 0 ? (
                <WordTags label="Antonyms" values={word.antonyms} />
              ) : null}
            </DetailSection>
          ) : null}

          {word.source || word.sourceSentence || word.personalNotes ? (
            <DetailSection title="Context">
              {word.source ? <LabelledValue label="SOURCE" value={word.source} /> : null}
              {word.sourceSentence ? (
                <LabelledValue label="ORIGINAL SENTENCE" value={word.sourceSentence} />
              ) : null}
              {word.personalNotes ? (
                <LabelledValue label="PERSONAL NOTES" value={word.personalNotes} />
              ) : null}
            </DetailSection>
          ) : null}

          <Card style={styles.datesCard}>
            <AppText tone="tertiary" variant="caption">
              SAVED {formatDate(word.createdAt)}
            </AppText>
            <AppText tone="tertiary" variant="caption">
              UPDATED {formatDate(word.updatedAt)}
            </AppText>
          </Card>

          <AppButton
            label="Edit word"
            onPress={() =>
              router.push({ pathname: '/word/[id]/edit', params: { id: word.id } })
            }
            variant="secondary"
          />
          <Pressable
            accessibilityRole="button"
            onPress={confirmDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <MaterialIcons
              color={theme.colors.semantic.error.foreground}
              name="delete-outline"
              size={20}
            />
            <AppText style={styles.deleteText} variant="label">
              Delete word
            </AppText>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  const styles = useStyles();

  return (
    <Card style={styles.section}>
      <AppText variant="subtitle">{title}</AppText>
      {children}
    </Card>
  );
}

function WordTags({ label, values }: { label: string; values: string[] }) {
  const styles = useStyles();

  return (
    <View style={styles.labelledValue}>
      <AppText tone="tertiary" variant="caption">
        {label.toUpperCase()}
      </AppText>
      <View style={styles.tags}>
        {values.map((value) => (
          <View key={value} style={styles.tag}>
            <AppText variant="caption">{value}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function LabelledValue({ label, value }: { label: string; value: string }) {
  const styles = useStyles();

  return (
    <View style={styles.labelledValue}>
      <AppText tone="tertiary" variant="caption">
        {label}
      </AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString();
}

const useStyles = createThemedStyles((theme) => ({
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    gap: theme.spacing.lg,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    width: '100%',
  },
  hero: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  heroTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  word: {
    flexShrink: 1,
  },
  partOfSpeech: {
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.pill,
    color: theme.colors.content.secondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  status: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  learning: {
    backgroundColor: theme.colors.learningStatus.learning.background,
  },
  learningText: {
    color: theme.colors.learningStatus.learning.foreground,
  },
  familiar: {
    backgroundColor: theme.colors.learningStatus.familiar.background,
  },
  familiarText: {
    color: theme.colors.learningStatus.familiar.foreground,
  },
  mastered: {
    backgroundColor: theme.colors.learningStatus.mastered.background,
  },
  masteredText: {
    color: theme.colors.learningStatus.mastered.foreground,
  },
  category: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  categoryDot: {
    borderRadius: theme.radius.pill,
    height: 9,
    width: 9,
  },
  section: {
    gap: theme.spacing.md,
  },
  simpleDefinition: {
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.md,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  bullet: {
    color: theme.colors.brand.primary,
  },
  bulletCopy: {
    flex: 1,
  },
  labelledValue: {
    gap: theme.spacing.xs,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tag: {
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  datesCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  deleteButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteText: {
    color: theme.colors.semantic.error.foreground,
  },
  pressed: {
    opacity: 0.62,
  },
}));
