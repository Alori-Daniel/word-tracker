import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppButton, AppText, Screen } from '@/components/ui';
import { useLocalData } from '@/data';
import { GoogleSignInButton, useAccount } from '@/features/auth';
import { createThemedStyles, useAppTheme } from '@/theme';

const ONBOARDING_SLIDES = [
  {
    description:
      'Build vocabulary with beautifully designed cards. See the word, flip, reveal the meaning, example, and collocation.',
    emoji: '📚',
    illustrationTone: 'success',
    title: 'Smart Flashcards',
  },
  {
    description:
      'Our algorithm surfaces words at the perfect moment — right before you forget, keeping retention high with minimal effort.',
    emoji: '🧠',
    illustrationTone: 'info',
    title: 'Spaced Repetition',
  },
  {
    description:
      'Watch your streak grow, accuracy improve, and level rise from Beginner to Advanced with detailed daily insights.',
    emoji: '📈',
    illustrationTone: 'warning',
    title: 'Track Progress',
  },
] as const;

type OnboardingStep = number | 'account';

export default function WelcomeScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { setOnboardingCompleted } = useLocalData();
  const { errorMessage: accountError, isConfigured: isAccountConfigured } = useAccount();
  const [step, setStep] = useState<OnboardingStep>(0);
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

  function showAccountChoice() {
    setStep('account');
  }

  function showNextSlide() {
    if (typeof step !== 'number') return;

    if (step === ONBOARDING_SLIDES.length - 1) {
      showAccountChoice();
      return;
    }

    setStep(step + 1);
  }

  if (step === 'account') {
    return (
      <Screen edges={['top', 'right', 'bottom', 'left']}>
        <ScrollView
          alwaysBounceVertical={false}
          contentContainerStyle={styles.accountContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.accountHero}>
            <View style={styles.brandMark}>
              <MaterialIcons color={theme.colors.brand.onPrimary} name="auto-stories" size={34} />
            </View>
            <View style={styles.accountCopy}>
              <AppText style={styles.centerText} variant="display">
                Welcome to WordEcho
              </AppText>
              <AppText style={styles.accountDescription} tone="secondary">
                Build your personal dictionary. No account required.
              </AppText>
            </View>
          </View>

          <View style={styles.accountActions}>
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

  const slide = ONBOARDING_SLIDES[step];
  const isLastSlide = step === ONBOARDING_SLIDES.length - 1;
  const illustrationBackground = theme.colors.semantic[slide.illustrationTone].background;

  return (
    <Screen edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.introContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.slideBody}>
          <View style={[styles.illustration, { backgroundColor: illustrationBackground }]}>
            <AppText accessibilityLabel={slide.title} style={styles.emoji}>
              {slide.emoji}
            </AppText>
          </View>

          <View style={styles.slideCopy}>
            <AppText style={styles.slideTitle} variant="display">
              {slide.title}
            </AppText>
            <AppText style={styles.slideDescription} tone="secondary">
              {slide.description}
            </AppText>
          </View>
        </View>

        <View style={styles.introFooter}>
          <View
            accessibilityLabel={`Step ${step + 1} of ${ONBOARDING_SLIDES.length}`}
            style={styles.dots}
          >
            {ONBOARDING_SLIDES.map((item, index) => (
              <View
                key={item.title}
                style={[styles.dot, index === step ? styles.activeDot : styles.inactiveDot]}
              />
            ))}
          </View>

          <View style={styles.navigationRow}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={showAccountChoice}
              style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
            >
              <AppText style={styles.skipLabel} variant="label">
                Skip
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={showNextSlide}
              style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
            >
              <AppText style={styles.nextLabel} variant="label">
                {isLastSlide ? 'Get started' : 'Next'}
              </AppText>
              <MaterialIcons color={theme.colors.brand.onPrimary} name="arrow-forward" size={20} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = createThemedStyles((theme) => ({
  introContent: {
    flexGrow: 1,
    marginHorizontal: 'auto',
    maxWidth: 620,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    width: '100%',
  },
  slideBody: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: theme.spacing.xl,
  },
  illustration: {
    alignItems: 'center',
    borderRadius: theme.radius.xl,
    height: 238,
    justifyContent: 'center',
    marginBottom: theme.spacing.xxl,
    width: 238,
  },
  emoji: {
    fontSize: 92,
    lineHeight: 112,
  },
  slideCopy: {
    alignItems: 'center',
    gap: theme.spacing.lg,
    maxWidth: 520,
  },
  slideTitle: {
    fontSize: 34,
    lineHeight: 41,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 18,
    lineHeight: 29,
    textAlign: 'center',
  },
  introFooter: {
    gap: theme.spacing.xl,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'center',
  },
  dot: {
    borderRadius: theme.radius.pill,
    height: 9,
  },
  activeDot: {
    backgroundColor: theme.colors.brand.primary,
    width: 38,
  },
  inactiveDot: {
    backgroundColor: theme.colors.brand.soft,
    width: 9,
  },
  navigationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    width: 92,
  },
  skipLabel: {
    color: theme.colors.content.secondary,
    fontSize: 17,
  },
  nextButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.radius.xl,
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: theme.spacing.lg,
  },
  nextButtonPressed: {
    backgroundColor: theme.colors.brand.pressed,
  },
  nextLabel: {
    color: theme.colors.brand.onPrimary,
    fontSize: 17,
  },
  pressed: {
    opacity: 0.6,
  },
  accountContent: {
    flexGrow: 1,
    gap: theme.spacing.xxl,
    justifyContent: 'center',
    marginHorizontal: 'auto',
    maxWidth: 560,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    width: '100%',
  },
  accountHero: {
    alignItems: 'center',
    gap: theme.spacing.xl,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.radius.xl,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  accountCopy: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
  accountDescription: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
  accountActions: {
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
