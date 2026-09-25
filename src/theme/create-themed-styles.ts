import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useAppTheme } from './theme-provider';
import type { AppTheme } from './themes';

export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: AppTheme) => T,
) {
  return function useThemedStyles(): T {
    const { theme } = useAppTheme();

    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
