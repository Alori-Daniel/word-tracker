import { View } from 'react-native';

import { createThemedStyles } from '@/theme';

import { AppText } from './app-text';

type PageHeaderProps = {
  description?: string;
  eyebrow?: string;
  title: string;
};

export function PageHeader({ description, eyebrow, title }: PageHeaderProps) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      {eyebrow ? (
        <AppText style={styles.eyebrow} variant="caption">
          {eyebrow.toUpperCase()}
        </AppText>
      ) : null}
      <AppText variant="title">{title}</AppText>
      {description ? <AppText tone="secondary">{description}</AppText> : null}
    </View>
  );
}

const useStyles = createThemedStyles((theme) => ({
  container: {
    gap: theme.spacing.xs,
  },
  eyebrow: {
    color: theme.colors.brand.primary,
    letterSpacing: 1.4,
  },
}));
