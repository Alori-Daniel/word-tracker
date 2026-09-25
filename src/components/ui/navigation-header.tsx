import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { createThemedStyles, useAppTheme } from '@/theme';

import { AppText } from './app-text';

type NavigationHeaderProps = {
  onBack: () => void;
  rightAccessory?: ReactNode;
  title: string;
};

export function NavigationHeader({ onBack, rightAccessory, title }: NavigationHeaderProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <MaterialIcons color={theme.colors.content.primary} name="arrow-back" size={24} />
      </Pressable>
      <AppText numberOfLines={1} style={styles.title} variant="subtitle">
        {title}
      </AppText>
      <View style={styles.right}>{rightAccessory}</View>
    </View>
  );
}

const useStyles = createThemedStyles((theme) => ({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: theme.spacing.md,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: {
    opacity: 0.58,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  right: {
    alignItems: 'flex-end',
    minWidth: 44,
  },
}));
