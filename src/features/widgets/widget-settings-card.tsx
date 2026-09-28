import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';

import { AppButton, AppText, Card } from '@/components/ui';
import { useLocalData } from '@/data';
import type {
  WidgetContentSource,
  WidgetPreferences,
  WidgetRotationMinutes,
  WidgetThemeMode,
} from '@/domain/widget';
import { useVocabulary } from '@/features/vocabulary';
import { requestPinVocabularyWidget } from '@/services/widgets';
import { createThemedStyles, useAppTheme } from '@/theme';

const CONTENT_OPTIONS: readonly { label: string; value: WidgetContentSource }[] = [
  { label: 'Learning', value: 'learning' },
  { label: 'Recent', value: 'recent' },
  { label: 'Favourites', value: 'favorites' },
  { label: 'Surprise me', value: 'random' },
];

const ROTATION_OPTIONS: readonly { label: string; value: WidgetRotationMinutes }[] = [
  { label: '30 min', value: 30 },
  { label: 'Hourly', value: 60 },
  { label: '3 hours', value: 180 },
  { label: 'Daily', value: 1_440 },
];

const THEME_OPTIONS: readonly { label: string; value: WidgetThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark blue', value: 'dark' },
];

export function WidgetSettingsCard() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { settings, setWidgetPreferences } = useLocalData();
  const { categories } = useVocabulary();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const preferences = settings.widgetPreferences;
  const hasSelectedCategory = categories.some(
    (category) => category.id === preferences.categoryId,
  );

  async function updatePreferences(patch: Partial<WidgetPreferences>) {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await setWidgetPreferences({ ...preferences, ...patch });
    } catch {
      setErrorMessage('The widget preference could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function addAndroidWidget() {
    const promptOpened = await requestPinVocabularyWidget();

    if (!promptOpened) {
      Alert.alert(
        'Add WordEcho manually',
        'Touch and hold an empty area on your Home Screen, choose Widgets, then select WordEcho.',
      );
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.iconContainer}>
          <MaterialIcons color={theme.colors.brand.primary} name="widgets" size={24} />
        </View>
        <View style={styles.headingCopy}>
          <AppText variant="label">WordEcho widget</AppText>
          <AppText tone="secondary" variant="caption">
            See a useful word and act on it without hunting through the app.
          </AppText>
        </View>
      </View>

      <PreferenceGroup label="Show words from">
        <View style={styles.choiceWrap}>
          {CONTENT_OPTIONS.map((option) => (
            <ChoiceChip
              disabled={isSaving}
              key={option.value}
              label={option.label}
              onPress={() => void updatePreferences({ contentSource: option.value })}
              selected={preferences.contentSource === option.value}
            />
          ))}
        </View>
      </PreferenceGroup>

      <PreferenceGroup label="Category">
        <ScrollView
          contentContainerStyle={styles.horizontalChoices}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <ChoiceChip
            disabled={isSaving}
            label="All categories"
            onPress={() => void updatePreferences({ categoryId: null })}
            selected={preferences.categoryId === null || !hasSelectedCategory}
          />
          {categories.map((category) => (
            <ChoiceChip
              disabled={isSaving}
              key={category.id}
              label={category.name}
              onPress={() => void updatePreferences({ categoryId: category.id })}
              selected={preferences.categoryId === category.id}
            />
          ))}
        </ScrollView>
      </PreferenceGroup>

      <PreferenceGroup label="Change word">
        <View style={styles.choiceWrap}>
          {ROTATION_OPTIONS.map((option) => (
            <ChoiceChip
              disabled={isSaving}
              key={option.value}
              label={option.label}
              onPress={() => void updatePreferences({ rotationMinutes: option.value })}
              selected={preferences.rotationMinutes === option.value}
            />
          ))}
        </View>
      </PreferenceGroup>

      <PreferenceGroup label="Widget colors">
        <View style={styles.choiceWrap}>
          {THEME_OPTIONS.map((option) => (
            <ChoiceChip
              disabled={isSaving}
              key={option.value}
              label={option.label}
              onPress={() => void updatePreferences({ themeMode: option.value })}
              selected={preferences.themeMode === option.value}
            />
          ))}
        </View>
      </PreferenceGroup>

      <View style={styles.actionSummary}>
        <MaterialIcons color={theme.colors.content.secondary} name="touch-app" size={19} />
        <AppText style={styles.actionCopy} tone="secondary" variant="caption">
          Add, Edit, and Review open the right place in WordEcho. Next changes the
          displayed word directly on the widget.
        </AppText>
      </View>

      {errorMessage ? (
        <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
          {errorMessage}
        </AppText>
      ) : null}

      {Platform.OS === 'android' ? (
        <AppButton
          label="Add widget to Home Screen"
          leftAccessory={
            <MaterialIcons color={theme.colors.brand.primary} name="add-to-home-screen" size={20} />
          }
          onPress={() => void addAndroidWidget()}
          variant="secondary"
        />
      ) : (
        <AppText tone="tertiary" variant="caption">
          {Platform.OS === 'ios'
            ? 'To add it, touch and hold your Home Screen, tap Edit, then Add Widget.'
            : 'Widget installation is available in the iOS and Android development builds.'}
        </AppText>
      )}
    </Card>
  );
}

function PreferenceGroup({ children, label }: { children: React.ReactNode; label: string }) {
  const styles = useStyles();

  return (
    <View style={styles.preferenceGroup}>
      <AppText tone="secondary" variant="caption">
        {label}
      </AppText>
      {children}
    </View>
  );
}

function ChoiceChip({
  disabled,
  label,
  onPress,
  selected,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        pressed && styles.choicePressed,
        disabled && styles.choiceDisabled,
      ]}
    >
      <AppText style={selected ? styles.choiceLabelSelected : undefined} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = createThemedStyles((theme) => ({
  card: {
    gap: theme.spacing.lg,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headingCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  preferenceGroup: {
    gap: theme.spacing.xs,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  horizontalChoices: {
    gap: theme.spacing.xs,
    paddingRight: theme.spacing.lg,
  },
  choice: {
    backgroundColor: theme.colors.background.muted,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  choiceSelected: {
    backgroundColor: theme.colors.brand.soft,
    borderColor: theme.colors.brand.primary,
  },
  choicePressed: {
    opacity: 0.75,
  },
  choiceDisabled: {
    opacity: 0.55,
  },
  choiceLabelSelected: {
    color: theme.colors.brand.primary,
  },
  actionSummary: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.background.muted,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  actionCopy: {
    flex: 1,
  },
  errorText: {
    color: theme.colors.semantic.error.foreground,
  },
}));
