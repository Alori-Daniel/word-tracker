import { View } from 'react-native';

import { AppButton, AppText } from '@/components/ui';
import { createThemedStyles } from '@/theme';

import { useAccount } from './account-provider';

type GoogleSignInButtonProps = {
  onSignedIn?: () => void | Promise<void>;
  variant?: 'primary' | 'secondary';
};

export function GoogleSignInButton({
  onSignedIn,
  variant = 'secondary',
}: GoogleSignInButtonProps) {
  const styles = useStyles();
  const { isConfigured, isSigningIn, signInWithGoogle } = useAccount();

  async function signIn() {
    const signedIn = await signInWithGoogle();
    if (signedIn) await onSignedIn?.();
  }

  return (
    <AppButton
      accessibilityLabel="Sign in with Google"
      disabled={!isConfigured}
      label="Sign in with Google"
      leftAccessory={
        <View style={styles.googleMark}>
          <AppText style={styles.googleMarkText} variant="label">
            G
          </AppText>
        </View>
      }
      loading={isSigningIn}
      onPress={() => void signIn()}
      variant={variant}
    />
  );
}

const useStyles = createThemedStyles((theme) => ({
  googleMark: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.surface,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  googleMarkText: {
    color: theme.colors.brand.primary,
  },
}));
