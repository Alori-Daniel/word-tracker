import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import {
  Animated,
  Pressable,
  View,
  useAnimatedValue,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { AppButton, AppText } from "@/components/ui";
import type {
  DictionaryLookup,
  DictionarySense,
  DictionarySenseSelection,
} from "@/domain/dictionary";
import { DictionaryGatewayError } from "@/services/dictionary";
import { createThemedStyles, useAppTheme } from "@/theme";

import { useDictionaryLookup } from "./dictionary-lookup-provider";

type DictionaryLookupPanelProps = {
  onSelect: (selection: DictionarySenseSelection) => void;
  word: string;
};

export function DictionaryLookupPanel({
  onSelect,
  word,
}: DictionaryLookupPanelProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { isConfigured, lookupWord } = useDictionaryLookup();
  const [lookup, setLookup] = useState<DictionaryLookup | null>(null);
  const [selectedSenseId, setSelectedSenseId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSenseIndex, setActiveSenseIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const scrollX = useAnimatedValue(0);

  const slideGap = theme.spacing.sm;
  const measuredCarouselWidth = carouselWidth || 320;
  const slidePeek =
    lookup && lookup.senses.length > 1
      ? Math.min(44, measuredCarouselWidth * 0.13)
      : 0;
  const slideWidth = Math.max(1, measuredCarouselWidth - slidePeek);
  const snapInterval = slideWidth + slideGap;

  async function runLookup() {
    setIsLoading(true);
    setLookup(null);
    setSelectedSenseId(null);
    setErrorMessage(null);
    setActiveSenseIndex(0);
    scrollX.setValue(0);

    try {
      const result = await lookupWord(word);
      setLookup(result.lookup);
    } catch (error) {
      setErrorMessage(
        error instanceof DictionaryGatewayError
          ? error.message
          : "Dictionary lookup is temporarily unavailable. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function selectSense(sense: DictionarySense) {
    if (!lookup) return;
    setSelectedSenseId(sense.id);
    onSelect({ lookup, sense });
  }

  function handleCarouselLayout(event: LayoutChangeEvent) {
    setCarouselWidth(event.nativeEvent.layout.width);
  }

  function handleCarouselScrollEnd(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    if (!lookup) return;

    const nextIndex = Math.max(
      0,
      Math.min(
        lookup.senses.length - 1,
        Math.round(event.nativeEvent.contentOffset.x / snapInterval),
      ),
    );
    setActiveSenseIndex(nextIndex);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <View style={styles.titleRow}>
            <AppText tone="secondary" variant="label">Dictionary assist</AppText>
            <View style={styles.freeBadge}>
              <AppText style={styles.freeLabel} variant="caption">
                Free
              </AppText>
            </View>
          </View>
        </View>
      </View>

      {!isConfigured ? (
        <AppText tone="tertiary" variant="caption">
          Dictionary lookup isn&apos;t available in this build yet.
        </AppText>
      ) : null}

      <AppButton
        disabled={!isConfigured}
        label="Find a meaning"
        leftAccessory={
          <MaterialIcons
            color={theme.colors.brand.primary}
            name="search"
            size={19}
          />
        }
        loading={isLoading}
        onPress={() => void runLookup()}
        variant="secondary"
      />

      {errorMessage ? (
        <AppText
          accessibilityRole="alert"
          style={styles.errorText}
          variant="caption"
        >
          {errorMessage}
        </AppText>
      ) : null}

      {lookup ? (
        <View style={styles.results}>
          <View style={styles.resultHeading}>
            <View style={styles.resultTitleRow}>
              <AppText variant="subtitle">Choose a meaning</AppText>
              <AppText tone="tertiary" variant="caption">
                {activeSenseIndex + 1} of {lookup.senses.length}
              </AppText>
            </View>
            {lookup.pronunciation ? (
              <AppText tone="secondary" variant="caption">
                {lookup.pronunciation}
              </AppText>
            ) : null}
          </View>

          <View onLayout={handleCarouselLayout} style={styles.carouselViewport}>
            <Animated.ScrollView
              accessibilityLabel="Dictionary meanings. Swipe horizontally to compare meanings."
              contentContainerStyle={[
                styles.carouselContent,
                { paddingRight: slidePeek },
              ]}
              decelerationRate="fast"
              disableIntervalMomentum
              horizontal
              onMomentumScrollEnd={handleCarouselScrollEnd}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true },
              )}
              onScrollEndDrag={handleCarouselScrollEnd}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              snapToAlignment="start"
              snapToInterval={snapInterval}
            >
              {lookup.senses.map((sense, index) => {
                const isSelected = sense.id === selectedSenseId;
                const inputRange = [
                  (index - 1) * snapInterval,
                  index * snapInterval,
                  (index + 1) * snapInterval,
                ];
                const opacity = scrollX.interpolate({
                  extrapolate: "clamp",
                  inputRange,
                  outputRange: [0.58, 1, 0.58],
                });
                const scale = scrollX.interpolate({
                  extrapolate: "clamp",
                  inputRange,
                  outputRange: [0.96, 1, 0.96],
                });
                const translateY = scrollX.interpolate({
                  extrapolate: "clamp",
                  inputRange,
                  outputRange: [6, 0, 6],
                });

                return (
                  <Animated.View
                    key={sense.id}
                    style={[
                      styles.slide,
                      {
                        marginRight: slideGap,
                        opacity,
                        transform: [{ translateY }, { scale }],
                        width: slideWidth,
                      },
                    ]}
                  >
                    <Pressable
                      accessibilityLabel={`Use meaning: ${sense.definition}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => selectSense(sense)}
                      style={({ pressed }) => [
                        styles.sense,
                        isSelected && styles.senseSelected,
                        pressed && styles.sensePressed,
                      ]}
                    >
                      <View style={styles.senseHeading}>
                        {sense.partOfSpeech ? (
                          <AppText
                            style={styles.partOfSpeech}
                            variant="caption"
                          >
                            {sense.partOfSpeech}
                          </AppText>
                        ) : (
                          <View />
                        )}
                        {isSelected ? (
                          <MaterialIcons
                            color={theme.colors.brand.primary}
                            name="check-circle"
                            size={19}
                          />
                        ) : null}
                      </View>
                      <AppText>{sense.definition}</AppText>
                      {sense.example ? (
                        <AppText tone="secondary" variant="caption">
                          “{sense.example}”
                        </AppText>
                      ) : null}
                      <AppText style={styles.useMeaning} variant="label">
                        {isSelected ? "Meaning selected" : "Use this meaning"}
                      </AppText>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </Animated.ScrollView>
          </View>

          {lookup.senses.length > 1 ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.pagination}
            >
              {lookup.senses.map((sense, index) => (
                <View
                  key={sense.id}
                  style={[
                    styles.paginationMark,
                    index === activeSenseIndex && styles.paginationMarkActive,
                  ]}
                />
              ))}
            </View>
          ) : null}

          <AppText tone="tertiary" variant="caption">
            Source: {lookup.attribution.providerName}
            {lookup.attribution.licenseName
              ? ` · ${lookup.attribution.licenseName}`
              : ""}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles((theme) => ({
  container: {
    borderBottomColor: theme.colors.border.subtle,
    borderBottomWidth: 1,
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  headingRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  headingCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  freeBadge: {
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
  },
  freeLabel: {
    color: theme.colors.brand.primary,
  },
  errorText: {
    color: theme.colors.semantic.error.foreground,
  },
  results: {
    gap: theme.spacing.sm,
  },
  resultHeading: {
    gap: theme.spacing.xxs,
  },
  resultTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  carouselViewport: {
    width: "100%",
  },
  carouselContent: {
    paddingVertical: theme.spacing.xs,
  },
  slide: {
    minHeight: 196,
  },
  sense: {
    borderBottomColor: theme.colors.border.subtle,
    borderBottomWidth: 1,
    borderLeftColor: "transparent",
    borderLeftWidth: 3,
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    flex: 1,
    gap: theme.spacing.xs,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  senseSelected: {
    backgroundColor: theme.colors.brand.soft,
    borderLeftColor: theme.colors.brand.primary,
  },
  sensePressed: {
    opacity: 0.82,
  },
  senseHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  partOfSpeech: {
    color: theme.colors.brand.primary,
    textTransform: "capitalize",
  },
  useMeaning: {
    color: theme.colors.brand.primary,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xxs,
    justifyContent: "center",
    minHeight: theme.spacing.xs,
  },
  paginationMark: {
    backgroundColor: theme.colors.border.default,
    borderRadius: theme.radius.pill,
    height: 3,
    width: 7,
  },
  paginationMarkActive: {
    backgroundColor: theme.colors.brand.primary,
    width: 22,
  },
}));
