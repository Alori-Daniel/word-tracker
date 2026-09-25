import { Button, HStack, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  controlSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  multilineTextAlignment,
  padding,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { VocabularyWidgetSnapshot } from '@/domain/widget';

const VocabularyVaultWidgetView = (
  props: VocabularyWidgetSnapshot,
  environment: WidgetEnvironment,
) => {
  'widget';

  const isDark =
    props.preferences.themeMode === 'dark' ||
    (props.preferences.themeMode === 'system' && environment.colorScheme === 'dark');
  const isSmall = environment.widgetFamily === 'systemSmall';
  const isLarge =
    environment.widgetFamily === 'systemLarge' ||
    environment.widgetFamily === 'systemExtraLarge';
  const backgroundColor = isDark ? '#10233A' : '#F7FAFD';
  const primaryText = isDark ? '#F3F6FB' : '#17202B';
  const secondaryText = isDark ? '#B8C9DD' : '#5A6878';
  const accent = isDark ? '#8FC5FF' : '#0878B8';
  const words = props.words;
  const word = words.length ? words[props.currentIndex % words.length] : null;
  const nextIndex = words.length ? (props.currentIndex + 1) % words.length : 0;
  const addLink = 'vocabularyvault://add';
  const reviewLink = 'vocabularyvault://review';
  const openLink = word
    ? `vocabularyvault://word/${encodeURIComponent(word.id)}`
    : 'vocabularyvault://add';
  const editLink = word
    ? `vocabularyvault://word/${encodeURIComponent(word.id)}/edit`
    : 'vocabularyvault://add';

  if (!word) {
    return (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[
          frame({ maxWidth: 1_000, maxHeight: 1_000, alignment: 'topLeading' }),
          padding({ all: 16 }),
          containerBackground(backgroundColor, 'widget'),
        ]}
      >
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(accent)]}>
          VOCABULARY VAULT
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 21, weight: 'bold', design: 'rounded' }),
            foregroundStyle(primaryText),
            lineLimit(2),
          ]}
        >
          Ready for a new word?
        </Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(secondaryText), lineLimit(2)]}>
          Add a word or change the widget filter in Settings.
        </Text>
        <Spacer />
        <Link
          destination={addLink}
          label="Add word"
          modifiers={[
            buttonStyle('borderedProminent'),
            controlSize('small'),
            tint(accent),
          ]}
        />
      </VStack>
    );
  }

  return (
    <VStack
      alignment="leading"
      spacing={isSmall ? 6 : 9}
      modifiers={[
        frame({ maxWidth: 1_000, maxHeight: 1_000, alignment: 'topLeading' }),
        padding({ all: isSmall ? 14 : 16 }),
        containerBackground(backgroundColor, 'widget'),
      ]}
    >
      <HStack spacing={6}>
        <Text
          modifiers={[
            font({ size: 10, weight: 'bold' }),
            foregroundStyle(accent),
            lineLimit(1),
          ]}
        >
          {props.sourceLabel.toUpperCase()}
        </Text>
        <Spacer />
        <Link
          destination={addLink}
          label="Add"
          modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(accent)]}
        />
      </HStack>

      <Link
        destination={openLink}
        modifiers={[frame({ maxWidth: 1_000, alignment: 'leading' })]}
      >
        <VStack alignment="leading" spacing={2}>
          <Text
            modifiers={[
              font({ size: isSmall ? 23 : isLarge ? 30 : 27, weight: 'bold', design: 'rounded' }),
              foregroundStyle(primaryText),
              lineLimit(isSmall ? 2 : 1),
              minimumScaleFactor(0.72),
            ]}
          >
            {word.word}
          </Text>
          {word.pronunciation || word.partOfSpeech ? (
            <Text
              modifiers={[
                font({ size: 11, weight: 'medium' }),
                foregroundStyle(secondaryText),
                lineLimit(1),
              ]}
            >
              {[word.pronunciation, word.partOfSpeech].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </VStack>
      </Link>

      <Text
        modifiers={[
          font({ size: isSmall ? 12 : 14, weight: 'medium' }),
          foregroundStyle(primaryText),
          lineLimit(isSmall ? 2 : isLarge ? 5 : 3),
          multilineTextAlignment('leading'),
        ]}
      >
        {word.definition || 'Open Vocabulary Vault to add a meaning.'}
      </Text>

      {isLarge && word.example ? (
        <Text
          modifiers={[
            font({ size: 13, design: 'serif' }),
            foregroundStyle(secondaryText),
            lineLimit(3),
          ]}
        >
          “{word.example}”
        </Text>
      ) : null}

      <Spacer />

      <HStack spacing={isSmall ? 5 : 8}>
        <Link
          destination={editLink}
          label={isSmall ? 'Edit' : 'Edit word'}
          modifiers={[
            buttonStyle('bordered'),
            controlSize('mini'),
            tint(accent),
          ]}
        />
        {isLarge ? (
          <Link
            destination={reviewLink}
            label="Review"
            modifiers={[
              buttonStyle('bordered'),
              controlSize('mini'),
              tint(accent),
            ]}
          />
        ) : null}
        <Spacer />
        <Button
          label="Next"
          systemImage="arrow.right"
          target="next-word"
          onPress={() => ({ ...props, currentIndex: nextIndex })}
          modifiers={[
            buttonStyle('borderedProminent'),
            controlSize('mini'),
            tint(accent),
          ]}
        />
      </HStack>
    </VStack>
  );
};

export default createWidget('VocabularyVaultWidget', VocabularyVaultWidgetView);
