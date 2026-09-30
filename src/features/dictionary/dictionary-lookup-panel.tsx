import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Pressable, View } from "react-native";

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

  async function runLookup() {
    setIsLoading(true);
    setLookup(null);
    setSelectedSenseId(null);
    setErrorMessage(null);

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
            <AppText variant="subtitle">Choose a meaning</AppText>
            {lookup.pronunciation ? (
              <AppText tone="secondary" variant="caption">
                {lookup.pronunciation}
              </AppText>
            ) : null}
          </View>

          {lookup.senses.map((sense) => {
            const isSelected = sense.id === selectedSenseId;

            return (
              <Pressable
                accessibilityLabel={`Use meaning: ${sense.definition}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={sense.id}
                onPress={() => selectSense(sense)}
                style={({ pressed }) => [
                  styles.sense,
                  isSelected && styles.senseSelected,
                  pressed && styles.sensePressed,
                ]}
              >
                <View style={styles.senseHeading}>
                  {sense.partOfSpeech ? (
                    <AppText style={styles.partOfSpeech} variant="caption">
                      {sense.partOfSpeech}
                    </AppText>
                  ) : null}
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
            );
          })}

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
    backgroundColor: theme.colors.background.canvas,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
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
  sense: {
    backgroundColor: theme.colors.background.muted,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  senseSelected: {
    backgroundColor: theme.colors.brand.soft,
    borderColor: theme.colors.brand.primary,
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
}));
