import { ActivityIndicator, Image, Pressable } from 'react-native';

import { AppText } from '@/components/ui';
import { createThemedStyles, useAppTheme } from '@/theme';

import { useAccount } from './account-provider';

type GoogleSignInButtonProps = {
  onSignedIn?: () => void | Promise<void>;
};

export function GoogleSignInButton({ onSignedIn }: GoogleSignInButtonProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { isConfigured, isSigningIn, signInWithGoogle } = useAccount();

  async function signIn() {
    const signedIn = await signInWithGoogle();
    if (signedIn) await onSignedIn?.();
  }

  return (
    <Pressable
      accessibilityLabel="Sign in with Google"
      accessibilityRole="button"
      accessibilityState={{ busy: isSigningIn, disabled: !isConfigured || isSigningIn }}
      disabled={!isConfigured || isSigningIn}
      onPress={() => void signIn()}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        (!isConfigured || isSigningIn) && styles.disabled,
      ]}
    >
      {isSigningIn ? (
        <ActivityIndicator color={theme.isDark ? '#E3E3E3' : '#1F1F1F'} />
      ) : (
        <>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={require('../../../assets/google-g-logo.png')}
            style={styles.googleLogo}
          />
          <AppText style={styles.label} variant="label">
            Sign in with Google
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const useStyles = createThemedStyles((theme) => ({
  button: {
    alignItems: 'center',
    backgroundColor: theme.isDark ? '#131314' : '#FFFFFF',
    borderColor: theme.isDark ? '#8E918F' : '#747775',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  googleLogo: {
    height: 20,
    width: 20,
  },
  label: {
    color: theme.isDark ? '#E3E3E3' : '#1F1F1F',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
}));
