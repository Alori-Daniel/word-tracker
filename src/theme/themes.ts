import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router';

import type { ThemeMode } from '@/domain/settings';

import { darkColors, lightColors, type AppColors } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

export type { ThemeMode } from '@/domain/settings';
export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;

export type AppTheme = {
  readonly isDark: boolean;
  readonly colors: AppColors;
  readonly spacing: typeof spacing;
  readonly radius: typeof radius;
  readonly shadows: typeof shadows;
  readonly typography: typeof typography;
};

export const lightTheme: AppTheme = {
  isDark: false,
  colors: lightColors,
  spacing,
  radius,
  shadows,
  typography,
};

export const darkTheme: AppTheme = {
  isDark: true,
  colors: darkColors,
  spacing,
  radius,
  shadows,
  typography,
};

export function createNavigationTheme(theme: AppTheme): NavigationTheme {
  const baseTheme = theme.isDark ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    dark: theme.isDark,
    colors: {
      ...baseTheme.colors,
      primary: theme.colors.brand.primary,
      background: theme.colors.background.canvas,
      card: theme.colors.background.surface,
      text: theme.colors.content.primary,
      border: theme.colors.border.subtle,
      notification: theme.colors.semantic.error.foreground,
    },
  };
}
