import { type ComponentProps } from 'react';
import { View } from 'react-native';

import { createThemedStyles } from '@/theme';

type CardProps = ComponentProps<typeof View>;

export function Card({ style, ...props }: CardProps) {
  const styles = useStyles();

  return <View style={[styles.card, style]} {...props} />;
}

const useStyles = createThemedStyles((theme) => ({
  card: {
    ...theme.shadows.card,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
}));
