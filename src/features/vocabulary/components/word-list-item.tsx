import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import type { Category, VocabularyWord } from '@/domain/vocabulary';
import { createThemedStyles, useAppTheme } from '@/theme';

type WordListItemProps = {
  category?: Category;
  onPress: () => void;
  word: VocabularyWord;
};

export function WordListItem({ category, onPress, word }: WordListItemProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const summary = word.simpleDefinition || word.definition || 'No definition added yet.';

  return (
    <Pressable
      accessibilityHint="Opens word details"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.wordCopy}>
          <View style={styles.titleRow}>
            <AppText numberOfLines={1} style={styles.title} variant="subtitle">
              {word.word}
            </AppText>
            {word.isFavorite ? (
              <MaterialIcons color={theme.colors.brand.primary} name="star" size={18} />
            ) : null}
          </View>
          {word.pronunciation ? (
            <AppText tone="tertiary" variant="caption">
              {word.pronunciation}
            </AppText>
          ) : null}
        </View>
        <MaterialIcons color={theme.colors.content.tertiary} name="chevron-right" size={22} />
      </View>

      <AppText numberOfLines={2} tone="secondary">
        {summary}
      </AppText>

      <View style={styles.metaRow}>
        <View style={[styles.status, styles[word.status]]}>
          <AppText style={styles[`${word.status}Text`]} variant="caption">
            {word.status[0].toUpperCase() + word.status.slice(1)}
          </AppText>
        </View>
        {category ? (
          <View style={styles.category}>
            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
            <AppText tone="tertiary" variant="caption">
              {category.name}
            </AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const useStyles = createThemedStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.background.surface,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wordCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  title: {
    flexShrink: 1,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  status: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
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
    height: 8,
    width: 8,
  },
}));
