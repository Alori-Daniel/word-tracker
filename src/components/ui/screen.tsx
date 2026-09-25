import { type ComponentProps } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createThemedStyles } from '@/theme';

type ScreenProps = ComponentProps<typeof SafeAreaView>;

export function Screen({ style, ...props }: ScreenProps) {
  const styles = useStyles();

  return <SafeAreaView style={[styles.screen, style]} {...props} />;
}

const useStyles = createThemedStyles((theme) => ({
  screen: {
    backgroundColor: theme.colors.background.canvas,
    flex: 1,
  },
}));
