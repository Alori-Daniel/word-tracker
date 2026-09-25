import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppButton, AppText, Card, Screen } from '@/components/ui';
import { useLocalData } from '@/data';
import { GoogleSignInButton, useAccount } from '@/features/auth';
import { createThemedStyles, useAppTheme } from '@/theme';

const BENEFITS = ['Save words as you find them', 'Organize your vocabulary', 'Review at your own pace'] as const;

export default function WelcomeScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { setOnboardingCompleted } = useLocalData();
  const { errorMessage: accountError, isConfigured: isAccountConfigured } = useAccount();
  const [isContinuing, setIsContinuing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function continueAsGuest() {
    setIsContinuing(true);
    setErrorMessage(null);

    try {
      await setOnboardingCompleted(true);
      router.replace('/(tabs)');
    } catch {
      setErrorMessage('We could not finish setup. Your data is safe—please try again.');
    } finally {
      setIsContinuing(false);
    }
  }

  async function finishGoogleSignIn() {
    try {
      await setOnboardingCompleted(true);
      router.replace('/(tabs)');
    } catch {
      setErrorMessage('You are signed in, but setup could not finish. Please try again.');
    }
  }

  return (
    <Screen edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <MaterialIcons color={theme.colors.brand.onPrimary} name="auto-stories" size={26} />
          </View>
          <AppText variant="label">Vocabulary Vault</AppText>
        </View>

        <View style={styles.hero}>
          <AppText style={styles.eyebrow} variant="caption">
            YOUR PERSONAL DICTIONARY
          </AppText>
          <AppText variant="display">Words worth keeping.</AppText>
          <AppText style={styles.heroCopy} tone="secondary">
            Build your personal dictionary. No account required.
          </AppText>
        </View>

        <Card style={styles.previewCard}>
          <View style={styles.previewTopRow}>
            <View style={styles.wordMark}>
              <AppText style={styles.wordMarkText} variant="title">
                Aa
              </AppText>
            </View>
            <View style={styles.previewCopy}>
              <AppText variant="subtitle">A vault that grows with you</AppText>
              <AppText tone="secondary" variant="caption">
                Private on this device until you choose to sync.
              </AppText>
            </View>
          </View>

          <View style={styles.benefitList}>
            {BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <MaterialIcons color={theme.colors.brand.primary} name="check-circle" size={20} />
                <AppText style={styles.benefitText}>{benefit}</AppText>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.actions}>
          {errorMessage || accountError ? (
            <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
              {errorMessage ?? accountError}
            </AppText>
          ) : null}
          <AppButton
            label="Continue as Guest"
            loading={isContinuing}
            onPress={() => void continueAsGuest()}
          />
          <GoogleSignInButton onSignedIn={finishGoogleSignIn} />
          <AppText style={styles.privacyNote} tone="tertiary" variant="caption">
            {isAccountConfigured
              ? 'Guest data stays on this device. You can connect an account later without losing it.'
              : 'Guest mode is ready. Google sign-in will activate after cloud configuration is added.'}
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = createThemedStyles((theme) => ({
  content: {
    flexGrow: 1,
    gap: theme.spacing.xl,
    justifyContent: 'center',
    marginHorizontal: 'auto',
    maxWidth: 560,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    width: '100%',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  hero: {
    gap: theme.spacing.sm,
  },
  eyebrow: {
    color: theme.colors.brand.primary,
    letterSpacing: 1.5,
  },
  heroCopy: {
    fontSize: 18,
    lineHeight: 27,
  },
  previewCard: {
    gap: theme.spacing.lg,
  },
  previewTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  wordMark: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.md,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  wordMarkText: {
    color: theme.colors.brand.primary,
  },
  previewCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  benefitList: {
    gap: theme.spacing.sm,
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  benefitText: {
    flex: 1,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.semantic.error.foreground,
    textAlign: 'center',
  },
  privacyNote: {
    paddingHorizontal: theme.spacing.sm,
    textAlign: 'center',
  },
}));
