import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Image,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { AppButton, AppText, Screen } from "@/components/ui";
import { useLocalData } from "@/data";
import { GoogleSignInButton, useAccount } from "@/features/auth";
import { createThemedStyles, useAppTheme } from "@/theme";

const ONBOARDING_SLIDES = [
  {
    accessibilityLabel:
      "A learner sitting on an open dictionary while selecting vocabulary cards.",
    description:
      "Build vocabulary with beautifully designed cards. See the word, flip, reveal the meaning, example, and collocation.",
    illustration: require("../../../assets/onboarding/smart-flashcards.png"),
    title: "Smart Flashcards",
  },
  {
    accessibilityLabel:
      "A learner revisiting vocabulary cards as they move around a clock.",
    description:
      "Our algorithm surfaces words at the perfect moment — right before you forget, keeping retention high with minimal effort.",
    illustration: require("../../../assets/onboarding/spaced-repetition.png"),
    title: "Spaced Repetition",
  },
  {
    accessibilityLabel:
      "A learner climbing a stack of books beside a rising streak path.",
    description:
      "Watch your streak grow, accuracy improve, and level rise from Beginner to Advanced with detailed daily insights.",
    illustration: require("../../../assets/onboarding/track-progress.png"),
    title: "Track Progress",
  },
] as const;

type OnboardingStep = number | "account";

type OnboardingSlideProps = {
  illustrationSize: number;
  index: number;
  pageWidth: number;
  scrollProgress: SharedValue<number>;
  slide: {
    accessibilityLabel: string;
    description: string;
    illustration: ImageSourcePropType;
    title: string;
  };
};

function OnboardingSlide({
  illustrationSize,
  index,
  pageWidth,
  scrollProgress,
  slide,
}: OnboardingSlideProps) {
  const styles = useStyles();
  const inputRange = [index - 1, index, index + 1];
  const illustrationStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollProgress.value,
      inputRange,
      [0.35, 1, 0.35],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          scrollProgress.value,
          inputRange,
          [0.94, 1, 0.94],
          Extrapolation.CLAMP,
        ),
      },
      {
        translateY: interpolate(
          scrollProgress.value,
          inputRange,
          [12, 0, 12],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollProgress.value,
      inputRange,
      [0.2, 1, 0.2],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateX: interpolate(
          scrollProgress.value,
          inputRange,
          [24, 0, -24],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={[styles.slidePage, { width: pageWidth }]}>
      <Animated.View
        style={[
          styles.illustration,
          { height: illustrationSize, width: illustrationSize },
          illustrationStyle,
        ]}
      >
        <Image
          accessible
          accessibilityLabel={slide.accessibilityLabel}
          resizeMode="contain"
          source={slide.illustration}
          style={styles.illustrationImage}
        />
      </Animated.View>

      <Animated.View style={[styles.slideCopy, copyStyle]}>
        <AppText style={styles.slideTitle} variant="editorial">
          {slide.title}
        </AppText>
        <AppText style={styles.slideDescription} tone="secondary">
          {slide.description}
        </AppText>
      </Animated.View>
    </View>
  );
}

export default function WelcomeScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { setOnboardingCompleted } = useLocalData();
  const { errorMessage: accountError, isConfigured: isAccountConfigured } =
    useAccount();
  const pagerRef = useRef<ScrollView>(null);
  const scrollProgress = useSharedValue(0);
  const [step, setStep] = useState<OnboardingStep>(0);
  const [isContinuing, setIsContinuing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pageWidth = Math.min(windowWidth, 620);
  const illustrationSize = Math.min(320, Math.max(230, windowHeight * 0.38));
  const handlePagerScroll = useAnimatedScrollHandler(
    (event) => {
      scrollProgress.value = event.contentOffset.x / pageWidth;
    },
    [pageWidth],
  );

  async function continueAsGuest() {
    setIsContinuing(true);
    setErrorMessage(null);

    try {
      await setOnboardingCompleted(true);
      router.replace("/(tabs)");
    } catch {
      setErrorMessage(
        "We could not finish setup. Your data is safe—please try again.",
      );
    } finally {
      setIsContinuing(false);
    }
  }

  async function finishGoogleSignIn() {
    try {
      await setOnboardingCompleted(true);
      router.replace("/(tabs)");
    } catch {
      setErrorMessage(
        "You are signed in, but setup could not finish. Please try again.",
      );
    }
  }

  function showAccountChoice() {
    setStep("account");
  }

  function showNextSlide() {
    if (typeof step !== "number") return;

    if (step === ONBOARDING_SLIDES.length - 1) {
      showAccountChoice();
      return;
    }

    const nextStep = step + 1;
    setStep(nextStep);
    pagerRef.current?.scrollTo({
      animated: true,
      x: nextStep * pageWidth,
      y: 0,
    });
  }

  function handlePagerMomentumEnd(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    const nextStep = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setStep(Math.max(0, Math.min(nextStep, ONBOARDING_SLIDES.length - 1)));
  }

  if (step === "account") {
    return (
      <Screen edges={["top", "right", "bottom", "left"]}>
        <ScrollView
          alwaysBounceVertical={false}
          contentContainerStyle={styles.accountContent}
          showsVerticalScrollIndicator={false}
        >
          {/* <View style={styles.accountHeader}>
            <AppText style={styles.wordEchoLabel} variant="caption">
              WORDECHO
            </AppText>
            <AppText tone="tertiary" variant="caption">
              YOUR PERSONAL VAULT
            </AppText>
          </View> */}

          <View style={styles.accountHero}>
            <MaterialIcons
              color={theme.colors.brand.primary}
              name="auto-stories"
              size={46}
            />
            <View style={styles.accountCopy}>
              <AppText style={styles.accountTitle} variant="editorial">
                Welcome to WordEcho
              </AppText>
              <AppText style={styles.accountDescription} tone="secondary">
                Begin without an account, or sign in to keep your vocabulary
                backed up and ready across devices.
              </AppText>
            </View>
          </View>

          <View style={styles.accountBenefits}>
            <AccountBenefit
              description="Your words remain private on this device."
              icon="phone-iphone"
              title="Start locally"
            />
            <AccountBenefit
              description="Restore and sync your vault whenever you change devices."
              icon="cloud-done"
              title="Keep it backed up"
            />
          </View>

          <View style={styles.accountActions}>
            <AppText
              style={styles.accountActionLabel}
              tone="tertiary"
              variant="caption"
            >
              CHOOSE HOW TO BEGIN
            </AppText>
            {errorMessage || accountError ? (
              <AppText
                accessibilityRole="alert"
                style={styles.errorText}
                variant="caption"
              >
                {errorMessage ?? accountError}
              </AppText>
            ) : null}
            <AppButton
              label="Continue as Guest"
              loading={isContinuing}
              onPress={() => void continueAsGuest()}
            />
            <GoogleSignInButton onSignedIn={finishGoogleSignIn} />
            <AppText
              style={styles.privacyNote}
              tone="tertiary"
              variant="caption"
            >
              {isAccountConfigured
                ? "Guest data stays on this device. You can connect an account later without losing it."
                : "Guest mode is ready. Google sign-in will activate after cloud configuration is added."}
            </AppText>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  const isLastSlide = step === ONBOARDING_SLIDES.length - 1;

  return (
    <Screen edges={["top", "right", "bottom", "left"]}>
      <View style={styles.introContent}>
        <View style={[styles.introHeader, styles.horizontalPadding]}>
          <AppText style={styles.wordEchoLabel} variant="caption">
            {/* WORDECHO */}
          </AppText>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={showAccountChoice}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <AppText style={styles.skipLabel} variant="label">
              Skip
            </AppText>
          </Pressable>
        </View>

        <Animated.ScrollView
          decelerationRate="fast"
          horizontal
          onMomentumScrollEnd={handlePagerMomentumEnd}
          onScroll={handlePagerScroll}
          pagingEnabled
          ref={pagerRef}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={styles.pager}
        >
          {ONBOARDING_SLIDES.map((slide, index) => (
            <OnboardingSlide
              illustrationSize={illustrationSize}
              index={index}
              key={slide.title}
              pageWidth={pageWidth}
              scrollProgress={scrollProgress}
              slide={slide}
            />
          ))}
        </Animated.ScrollView>

        <View style={[styles.introFooter, styles.horizontalPadding]}>
          <View style={styles.progressGroup}>
            <AppText style={styles.stepCount} tone="tertiary" variant="caption">
              {String(step + 1).padStart(2, "0")} /{" "}
              {String(ONBOARDING_SLIDES.length).padStart(2, "0")}
            </AppText>
            <View
              accessibilityLabel={`Step ${step + 1} of ${ONBOARDING_SLIDES.length}`}
              style={styles.dots}
            >
              {ONBOARDING_SLIDES.map((item, index) => (
                <View
                  key={item.title}
                  style={[
                    styles.dot,
                    index === step ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>
          </View>

          <Pressable
            accessibilityLabel={
              isLastSlide ? "Continue to account options" : "Next introduction"
            }
            accessibilityRole="button"
            onPress={showNextSlide}
            style={({ pressed }) => [
              styles.nextAction,
              pressed && styles.pressed,
            ]}
          >
            <AppText style={styles.nextLabel} variant="label">
              {isLastSlide ? "Continue" : "Next"}
            </AppText>
            <View style={styles.nextArrow}>
              <MaterialIcons
                color={theme.colors.brand.onPrimary}
                name="arrow-forward"
                size={21}
              />
            </View>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function AccountBenefit({
  description,
  icon,
  title,
}: {
  description: string;
  icon: "cloud-done" | "phone-iphone";
  title: string;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={styles.accountBenefitRow}>
      <MaterialIcons color={theme.colors.brand.primary} name={icon} size={23} />
      <View style={styles.accountBenefitCopy}>
        <AppText variant="label">{title}</AppText>
        <AppText tone="secondary" variant="caption">
          {description}
        </AppText>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((theme) => ({
  introContent: {
    flex: 1,
    marginHorizontal: "auto",
    maxWidth: 620,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    width: "100%",
  },
  horizontalPadding: {
    paddingHorizontal: theme.spacing.lg,
  },
  introHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
  },
  wordEchoLabel: {
    color: theme.colors.brand.primary,
    letterSpacing: 1.7,
  },
  pager: {
    flex: 1,
  },
  slidePage: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  illustration: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.xl,
  },
  illustrationImage: {
    height: "100%",
    width: "100%",
  },
  slideCopy: {
    alignItems: "center",
    gap: theme.spacing.lg,
    maxWidth: 520,
  },
  slideTitle: {
    fontSize: 34,
    lineHeight: 41,
    textAlign: "center",
  },
  slideDescription: {
    fontSize: 18,
    lineHeight: 29,
    textAlign: "center",
  },
  introFooter: {
    alignItems: "center",
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: theme.spacing.md,
  },
  progressGroup: {
    gap: theme.spacing.xs,
  },
  stepCount: {
    letterSpacing: 1,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xxs,
  },
  dot: {
    borderRadius: theme.radius.pill,
    height: 4,
  },
  activeDot: {
    backgroundColor: theme.colors.brand.primary,
    width: 28,
  },
  inactiveDot: {
    backgroundColor: theme.colors.border.default,
    width: 14,
  },
  skipLabel: {
    color: theme.colors.content.secondary,
  },
  nextAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 52,
  },
  nextArrow: {
    alignItems: "center",
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.radius.pill,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  nextLabel: {
    color: theme.colors.brand.primary,
  },
  pressed: {
    opacity: 0.6,
  },
  accountContent: {
    flexGrow: 1,
    gap: theme.spacing.xl,
    marginHorizontal: "auto",
    maxWidth: 560,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    width: "100%",
  },
  accountHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
  },
  accountHero: {
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  accountCopy: {
    gap: theme.spacing.md,
  },
  accountTitle: {
    fontSize: 42,
    lineHeight: 48,
    maxWidth: 420,
  },
  accountDescription: {
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 500,
  },
  accountBenefits: {
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
  },
  accountBenefitRow: {
    alignItems: "flex-start",
    borderBottomColor: theme.colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  accountBenefitCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  accountActions: {
    gap: theme.spacing.sm,
    marginTop: "auto",
  },
  accountActionLabel: {
    letterSpacing: 1.2,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.semantic.error.foreground,
    textAlign: "center",
  },
  privacyNote: {
    paddingHorizontal: theme.spacing.sm,
    textAlign: "center",
  },
}));
