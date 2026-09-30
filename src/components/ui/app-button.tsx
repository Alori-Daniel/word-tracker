import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';

import { createThemedStyles, useAppTheme } from '@/theme';

import { AppText } from './app-text';

type AppButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  leftAccessory?: ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function AppButton({
  disabled,
  label,
  leftAccessory,
  loading = false,
  variant = 'primary',
  ...props
}: AppButtonProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && (isPrimary ? styles.primaryPressed : styles.pressed),
        isDisabled && styles.disabled,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={isPrimary ? theme.colors.brand.onPrimary : theme.colors.brand.primary}
          />
        ) : (
          <>
            {leftAccessory}
            <AppText style={isPrimary && styles.primaryLabel} variant="label">
              {label}
            </AppText>
          </>
        )}
      </View>
    </Pressable>
  );
}

const useStyles = createThemedStyles((theme) => ({
  base: {
    minHeight: 54,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    minHeight: 24,
  },
  primary: {
    backgroundColor: theme.colors.brand.primary,
  },
  primaryLabel: {
    color: theme.colors.brand.onPrimary,
  },
  primaryPressed: {
    backgroundColor: theme.colors.brand.pressed,
  },
  secondary: {
    backgroundColor: theme.colors.background.surface,
    borderColor: theme.colors.border.subtle,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
}));
