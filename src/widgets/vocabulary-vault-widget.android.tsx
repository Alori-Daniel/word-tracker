import {
  FlexWidget,
  TextWidget,
  type WidgetInfo,
  type WidgetRepresentation,
} from 'react-native-android-widget';

import type { VocabularyWidgetSnapshot, WidgetThemeMode } from '@/domain/widget';
import { vocabularyWidgetLinks } from '@/services/widgets/widget-links';

type Palette = {
  accent: `#${string}`;
  actionBackground: `#${string}`;
  background: `#${string}`;
  primary: `#${string}`;
  secondary: `#${string}`;
};

function palette(isDark: boolean): Palette {
  return isDark
    ? {
        background: '#10233A',
        primary: '#F3F6FB',
        secondary: '#B8C9DD',
        accent: '#8FC5FF',
        actionBackground: '#1B3959',
      }
    : {
        background: '#F7FAFD',
        primary: '#17202B',
        secondary: '#5A6878',
        accent: '#0878B8',
        actionBackground: '#E2F1FA',
      };
}

function Action({
  label,
  link,
  colors,
}: {
  colors: Palette;
  label: string;
  link?: string;
}) {
  return (
    <TextWidget
      accessibilityLabel={label}
      clickAction={link ? 'OPEN_URI' : 'NEXT_WORD'}
      clickActionData={link ? { uri: link } : undefined}
      text={label}
      style={{
        backgroundColor: colors.actionBackground,
        borderRadius: 18,
        color: colors.accent,
        fontSize: 12,
        fontWeight: '700',
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    />
  );
}

export function renderVocabularyVaultAndroidWidget(
  snapshot: VocabularyWidgetSnapshot,
  widgetInfo: WidgetInfo,
  isDark: boolean,
) {
  const colors = palette(isDark);
  const isSmall = widgetInfo.width < 220;
  const isLarge = widgetInfo.height >= 250;
  const currentWord = snapshot.words.length
    ? snapshot.words[snapshot.currentIndex % snapshot.words.length]
    : null;

  if (!currentWord) {
    return (
      <FlexWidget
        accessibilityLabel="Vocabulary Vault widget. No words match the current filter."
        clickAction="OPEN_URI"
        clickActionData={{ uri: vocabularyWidgetLinks.addWord }}
        style={{
          backgroundColor: colors.background,
          borderRadius: 22,
          flexDirection: 'column',
          height: 'match_parent',
          justifyContent: 'center',
          padding: 18,
          width: 'match_parent',
        }}
      >
        <TextWidget
          text="VOCABULARY VAULT"
          maxLines={1}
          style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}
        />
        <TextWidget
          text="Ready for a new word?"
          maxLines={2}
          style={{
            color: colors.primary,
            fontSize: 22,
            fontWeight: '700',
            marginTop: 12,
          }}
        />
        <TextWidget
          text="Add a word or change the widget filter in Settings."
          maxLines={2}
          style={{ color: colors.secondary, fontSize: 13, marginTop: 6 }}
        />
      </FlexWidget>
    );
  }

  const openLink = vocabularyWidgetLinks.openWord(currentWord.id);
  const editLink = vocabularyWidgetLinks.editWord(currentWord.id);
  const meta = [currentWord.pronunciation, currentWord.partOfSpeech]
    .filter(Boolean)
    .join(' · ');

  return (
    <FlexWidget
      accessibilityLabel={`Vocabulary word: ${currentWord.word}`}
      style={{
        backgroundColor: colors.background,
        borderRadius: 22,
        flexDirection: 'column',
        height: 'match_parent',
        padding: isSmall ? 14 : 18,
        width: 'match_parent',
      }}
    >
      <FlexWidget style={{ alignItems: 'center', flexDirection: 'row', width: 'match_parent' }}>
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget
            text={snapshot.sourceLabel.toUpperCase()}
            maxLines={1}
            style={{ color: colors.accent, fontSize: 10, fontWeight: '700' }}
          />
        </FlexWidget>
        <Action colors={colors} label="+ Add" link={vocabularyWidgetLinks.addWord} />
      </FlexWidget>

      <FlexWidget
        accessibilityLabel={`Open ${currentWord.word}`}
        clickAction="OPEN_URI"
        clickActionData={{ uri: openLink }}
        style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}
      >
        <TextWidget
          text={currentWord.word}
          maxLines={isSmall ? 2 : 1}
          style={{
            adjustsFontSizeToFit: true,
            color: colors.primary,
            fontSize: isSmall ? 24 : isLarge ? 31 : 28,
            fontWeight: '700',
            marginTop: 8,
          }}
        />
        {meta ? (
          <TextWidget
            text={meta}
            maxLines={1}
            style={{ color: colors.secondary, fontSize: 11, marginTop: 3 }}
          />
        ) : null}
        <TextWidget
          text={currentWord.definition || 'Open Vocabulary Vault to add a meaning.'}
          maxLines={isSmall ? 3 : isLarge ? 5 : 3}
          style={{
            color: colors.primary,
            fontSize: isSmall ? 12 : 14,
            lineHeight: isSmall ? 16 : 19,
            marginTop: 8,
          }}
        />
        {isLarge && currentWord.example ? (
          <TextWidget
            text={`“${currentWord.example}”`}
            maxLines={3}
            style={{
              color: colors.secondary,
              fontSize: 13,
              fontStyle: 'italic',
              marginTop: 10,
            }}
          />
        ) : null}
      </FlexWidget>

      <FlexWidget
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        <Action colors={colors} label="Edit" link={editLink} />
        {isLarge ? (
          <Action colors={colors} label="Review" link={vocabularyWidgetLinks.review} />
        ) : null}
        <Action colors={colors} label="Next ›" />
      </FlexWidget>
    </FlexWidget>
  );
}

function representationForTheme(
  snapshot: VocabularyWidgetSnapshot,
  widgetInfo: WidgetInfo,
  themeMode: WidgetThemeMode,
): WidgetRepresentation {
  if (themeMode === 'light') {
    const widget = renderVocabularyVaultAndroidWidget(snapshot, widgetInfo, false);
    return { light: widget, dark: widget };
  }

  if (themeMode === 'dark') {
    const widget = renderVocabularyVaultAndroidWidget(snapshot, widgetInfo, true);
    return { light: widget, dark: widget };
  }

  return {
    light: renderVocabularyVaultAndroidWidget(snapshot, widgetInfo, false),
    dark: renderVocabularyVaultAndroidWidget(snapshot, widgetInfo, true),
  };
}

export function createVocabularyVaultAndroidRepresentation(
  snapshot: VocabularyWidgetSnapshot,
  widgetInfo: WidgetInfo,
): WidgetRepresentation {
  return representationForTheme(snapshot, widgetInfo, snapshot.preferences.themeMode);
}
