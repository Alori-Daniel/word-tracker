import { ActivityIndicator, View } from 'react-native';

import { AppText, Screen } from '@/components/ui';
import { createThemedStyles, useAppTheme } from '@/theme';

export default function AuthCallbackScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <Screen edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.content}>
        <ActivityIndicator color={theme.colors.brand.primary} size="large" />
        <AppText variant="subtitle">Completing Google sign-in…</AppText>
        <AppText tone="secondary">You can return to WordEcho shortly.</AppText>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles((theme) => ({
  content: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.sm,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
}));
