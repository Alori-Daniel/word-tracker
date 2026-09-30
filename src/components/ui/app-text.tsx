import { type ComponentProps } from 'react';
import { Text } from 'react-native';

import { createThemedStyles, type TextVariant } from '@/theme';

type AppTextProps = ComponentProps<typeof Text> & {
  variant?: TextVariant;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'inverse';
};

export function AppText({
  style,
  tone = 'primary',
  variant = 'body',
  ...props
}: AppTextProps) {
  const styles = useStyles();

  return <Text style={[styles.base, styles[variant], styles[tone], style]} {...props} />;
}

const useStyles = createThemedStyles((theme) => ({
  base: {
    color: theme.colors.content.primary,
  },
  editorial: theme.typography.editorial,
  display: theme.typography.display,
  title: theme.typography.title,
  subtitle: theme.typography.subtitle,
  body: theme.typography.body,
  label: theme.typography.label,
  caption: theme.typography.caption,
  primary: {
    color: theme.colors.content.primary,
  },
  secondary: {
    color: theme.colors.content.secondary,
  },
  tertiary: {
    color: theme.colors.content.tertiary,
  },
  inverse: {
    color: theme.colors.content.inverse,
  },
}));
