import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppButton, AppText, Card, NavigationHeader, Screen } from '@/components/ui';
import { DuplicateCategoryError } from '@/data';
import type { Category } from '@/domain/vocabulary';
import { useVocabulary } from '@/features/vocabulary';
import { createThemedStyles, useAppTheme } from '@/theme';

const CATEGORY_COLORS = [
  '#0878B8',
  '#2563A8',
  '#7A5AF8',
  '#A44F79',
  '#B66A12',
  '#16856A',
  '#6B7280',
] as const;

export default function CategoriesScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { categories, createCategory, deleteCategory } = useVocabulary();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function addCategory() {
    if (!name.normalize('NFKC').trim()) {
      setErrorMessage('Enter a category name.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await createCategory({ color, name });
      setName('');
    } catch (error) {
      setErrorMessage(
        error instanceof DuplicateCategoryError
          ? error.message
          : 'The category could not be saved. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete(category: Category) {
    Alert.alert(
      'Delete category?',
      `Words in “${category.name}” will remain in your vault without this category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteCategory(category.id).catch(() =>
              Alert.alert('Could not delete category', 'Please try again.'),
            );
          },
        },
      ],
    );
  }

  return (
    <Screen edges={['top', 'right', 'bottom', 'left']}>
      <NavigationHeader onBack={() => router.back()} title="Categories" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.createCard}>
          <View style={styles.headingCopy}>
            <AppText variant="subtitle">New category</AppText>
            <AppText tone="secondary">Create a group that matches how you collect words.</AppText>
          </View>
          <TextInput
            accessibilityLabel="Category name"
            maxLength={60}
            onChangeText={setName}
            onSubmitEditing={() => void addCategory()}
            placeholder="Category name"
            placeholderTextColor={theme.colors.content.tertiary}
            returnKeyType="done"
            selectionColor={theme.colors.brand.primary}
            style={styles.input}
            value={name}
          />
          <View style={styles.colorRow}>
            {CATEGORY_COLORS.map((item) => {
              const selected = color === item;
              return (
                <Pressable
                  accessibilityLabel={`Use color ${item}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={item}
                  onPress={() => setColor(item)}
                  style={[
                    styles.colorChoice,
                    { backgroundColor: item },
                    selected && styles.colorChoiceSelected,
                  ]}
                >
                  {selected ? <MaterialIcons color="#FFFFFF" name="check" size={18} /> : null}
                </Pressable>
              );
            })}
          </View>
          {errorMessage ? (
            <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
              {errorMessage}
            </AppText>
          ) : null}
          <AppButton label="Create category" loading={isSaving} onPress={() => void addCategory()} />
        </Card>

        <View style={styles.listSection}>
          <AppText variant="subtitle">Your categories</AppText>
          <Card style={styles.listCard}>
            {categories.map((category, index) => (
              <View
                key={category.id}
                style={[styles.categoryRow, index > 0 && styles.categoryRowBorder]}
              >
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <View style={styles.categoryCopy}>
                  <AppText variant="label">{category.name}</AppText>
                  <AppText tone="tertiary" variant="caption">
                    {category.isDefault ? 'Default category' : 'Custom category'}
                  </AppText>
                </View>
                {!category.isDefault ? (
                  <Pressable
                    accessibilityLabel={`Delete ${category.name}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => confirmDelete(category)}
                  >
                    <MaterialIcons
                      color={theme.colors.semantic.error.foreground}
                      name="delete-outline"
                      size={22}
                    />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = createThemedStyles((theme) => ({
  content: {
    gap: theme.spacing.xl,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    width: '100%',
  },
  createCard: {
    gap: theme.spacing.md,
  },
  headingCopy: {
    gap: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background.canvas,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    color: theme.colors.content.primary,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  colorChoice: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: theme.radius.pill,
    borderWidth: 3,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  colorChoiceSelected: {
    borderColor: theme.colors.content.primary,
  },
  errorText: {
    color: theme.colors.semantic.error.foreground,
  },
  listSection: {
    gap: theme.spacing.sm,
  },
  listCard: {
    paddingVertical: theme.spacing.xs,
  },
  categoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 62,
    paddingVertical: theme.spacing.sm,
  },
  categoryRowBorder: {
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
  },
  categoryDot: {
    borderRadius: theme.radius.pill,
    height: 14,
    width: 14,
  },
  categoryCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
}));
