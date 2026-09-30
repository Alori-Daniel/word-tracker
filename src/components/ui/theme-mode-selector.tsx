import { Pressable, View } from 'react-native';

import { createThemedStyles, useAppTheme, type ThemeMode } from '@/theme';

import { AppText } from './app-text';

const OPTIONS: readonly { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export function ThemeModeSelector() {
  const styles = useStyles();
  const { mode, setMode } = useAppTheme();

  return (
    <View accessibilityRole="radiogroup" style={styles.container}>
      {OPTIONS.map((option) => {
        const isSelected = option.value === mode;

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            key={option.value}
            onPress={() => setMode(option.value)}
            style={({ pressed }) => [
              styles.option,
              isSelected && styles.optionSelected,
              pressed && styles.optionPressed,
            ]}
          >
            <AppText
              style={isSelected && styles.optionTextSelected}
              tone={isSelected ? 'primary' : 'secondary'}
              variant="label"
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = createThemedStyles((theme) => ({
  container: {
    borderBottomColor: theme.colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    padding: theme.spacing.xxs,
  },
  option: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  optionSelected: {
    borderBottomColor: theme.colors.brand.primary,
  },
  optionPressed: {
    opacity: 0.8,
  },
  optionTextSelected: {
    color: theme.colors.brand.primary,
  },
}));
