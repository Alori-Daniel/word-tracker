import { Link, Stack } from 'expo-router';

import { AppText, Card, Screen } from '@/components/ui';
import { createThemedStyles } from '@/theme';

export default function NotFoundScreen() {
  const styles = useStyles();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen style={styles.screen}>
        <Card style={styles.card}>
          <AppText variant="title">This page is not in your vault.</AppText>
          <AppText tone="secondary">The link may be incomplete or no longer available.</AppText>
          <Link href="/" style={styles.link}>
            Return home
          </Link>
        </Card>
      </Screen>
    </>
  );
}

const useStyles = createThemedStyles((theme) => ({
  screen: {
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    gap: theme.spacing.md,
  },
  link: {
    color: theme.colors.brand.primary,
    ...theme.typography.label,
  },
}));
