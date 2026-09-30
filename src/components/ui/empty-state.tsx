import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { createThemedStyles, useAppTheme } from '@/theme';

import { AppButton } from './app-button';
import { AppText } from './app-text';
import { Card } from './card';

type EmptyStateProps = {
  actionLabel?: string;
  description: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  onAction?: () => void;
  title: string;
};

export function EmptyState({ actionLabel, description, icon, onAction, title }: EmptyStateProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.iconContainer}>
        <MaterialIcons color={theme.colors.brand.primary} name={icon} size={30} />
      </View>
      <View style={styles.copy}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText style={styles.description} tone="secondary">
          {description}
        </AppText>
      </View>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <AppButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
}

const useStyles = createThemedStyles((theme) => ({
  card: {
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xxl,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  copy: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  description: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.xs,
  },
}));
