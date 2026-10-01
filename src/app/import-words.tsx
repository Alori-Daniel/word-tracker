import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { AppButton, AppText, NavigationHeader, Screen } from '@/components/ui';
import { CsvImportLimitError } from '@/data';
import type { CsvImportPreview, CsvWordImportRecord } from '@/domain/csv-import';
import { getCsvImportAllowance } from '@/domain/subscription';
import type { VocabularyWord } from '@/domain/vocabulary';
import { useSubscription } from '@/features/subscriptions';
import { useVocabulary } from '@/features/vocabulary';
import { InvalidCsvError, parseVocabularyCsv } from '@/services/import';
import { createThemedStyles, useAppTheme } from '@/theme';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const SAMPLE_CSV =
  'word,meaning,category,learning_status,favorite,synonyms\n' +
  'ephemeral,"lasting for a very short time",Literature,learning,false,"brief | fleeting"';

type SelectedPreview = CsvImportPreview & {
  existingDuplicateRows: number[];
  fileName: string;
  importableRecords: CsvWordImportRecord[];
};

export default function ImportWordsScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { subscription } = useSubscription();
  const { getCsvImportCount, importCsvWords, listWords } = useVocabulary();
  const [completedImports, setCompletedImports] = useState(0);
  const [isPicking, setIsPicking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<SelectedPreview | null>(null);

  const loadCompletedImports = useCallback(async () => {
    setCompletedImports(await getCsvImportCount());
  }, [getCsvImportCount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCompletedImports();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadCompletedImports]);

  const allowance = useMemo(
    () => getCsvImportAllowance(subscription.status, completedImports),
    [completedImports, subscription.status],
  );

  async function chooseFile() {
    if (!allowance.allowed) {
      Alert.alert(
        'Free imports used',
        'You have used all five free CSV imports. Premium includes unlimited imports.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'View Premium', onPress: () => router.push('/subscription') },
        ],
      );
      return;
    }

    setIsPicking(true);
    try {
      const selection = await File.pickFileAsync({
        mimeTypes: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
      });
      if (selection.canceled) return;
      if (selection.result.size > MAX_FILE_BYTES) {
        throw new InvalidCsvError('Choose a CSV file smaller than 5 MB.');
      }

      const parsed = parseVocabularyCsv(await selection.result.text());
      const existingWords = await loadAllWords(listWords);
      const existing = new Set(existingWords.map((word) => normalizeWord(word.word)));
      const existingDuplicateRows: number[] = [];
      const importableRecords = parsed.records.filter((record) => {
        if (!existing.has(normalizeWord(record.input.word))) return true;
        existingDuplicateRows.push(record.rowNumber);
        return false;
      });

      setPreview({
        ...parsed,
        existingDuplicateRows,
        fileName: selection.result.name,
        importableRecords,
      });
    } catch (error) {
      setPreview(null);
      Alert.alert(
        'CSV could not be read',
        error instanceof InvalidCsvError
          ? error.message
          : 'Check that the file is a valid CSV and try again.',
      );
    } finally {
      setIsPicking(false);
    }
  }

  async function confirmImport() {
    if (!preview || preview.issues.length > 0 || preview.importableRecords.length === 0) return;

    setIsImporting(true);
    try {
      const imported = await importCsvWords(preview.importableRecords, subscription.isPremium);
      await loadCompletedImports();
      setPreview(null);
      Alert.alert(
        'Import complete',
        `${imported} ${imported === 1 ? 'word was' : 'words were'} added to your vault.`,
        [{ text: 'View words', onPress: () => router.replace('/(tabs)/library') }],
      );
    } catch (error) {
      if (error instanceof CsvImportLimitError) {
        await loadCompletedImports();
        Alert.alert('Free imports used', 'Premium includes unlimited CSV imports.');
      } else {
        Alert.alert(
          'Import not completed',
          'No words were imported. Resolve any duplicates or file errors, then try again.',
        );
      }
    } finally {
      setIsImporting(false);
    }
  }

  const skippedCount = preview
    ? preview.duplicateRows.length + preview.existingDuplicateRows.length
    : 0;

  return (
    <Screen edges={['top', 'right', 'left']}>
      <NavigationHeader onBack={() => router.back()} title="Import words" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <AppText variant="title">Bring your words with you</AppText>
          <AppText tone="secondary">
            Choose a CSV, review it first, then add every valid new word in one step.
          </AppText>
          <View style={styles.allowanceRow}>
            <MaterialIcons color={theme.colors.brand.primary} name="upload-file" size={20} />
            <AppText variant="label">
              {allowance.reason === 'premium'
                ? 'Unlimited imports with Premium'
                : `${allowance.remaining ?? 0} of 5 free imports remaining`}
            </AppText>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading number="01" title="Structure your CSV" />
          <AppText tone="secondary">
            The first row must contain column names. Column order does not matter.
          </AppText>
          <View style={styles.ruleList}>
            <FormatRule label="Required" value="word, meaning" />
            <FormatRule
              label="Optional"
              value="simple_meaning, part_of_speech, pronunciation, examples, synonyms, antonyms, category, learning_status, favorite, notes, source, source_sentence"
            />
            <FormatRule label="Lists" value="Separate multiple items with  |  (a vertical bar)." />
            <FormatRule label="Status" value="Use learning, familiar, or mastered." />
            <FormatRule label="Favorite" value="Use true or false." />
          </View>
          <AppText tone="secondary" variant="caption">
            Categories that do not exist are created automatically. Export-only created_at and
            updated_at columns are accepted but ignored.
          </AppText>
        </View>

        <View style={styles.section}>
          <SectionHeading number="02" title="Use this example" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codeScroller}>
            <AppText selectable style={styles.code} variant="caption">{SAMPLE_CSV}</AppText>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeading number="03" title="Choose and review" />
          <AppButton
            disabled={!allowance.allowed}
            label={preview ? 'Choose another CSV' : 'Choose CSV file'}
            leftAccessory={
              <MaterialIcons color={theme.colors.brand.onPrimary} name="upload-file" size={21} />
            }
            loading={isPicking}
            onPress={() => void chooseFile()}
          />
          {!allowance.allowed ? (
            <AppButton
              label="View Premium"
              onPress={() => router.push('/subscription')}
              variant="secondary"
            />
          ) : null}
        </View>

        {preview ? (
          <View style={styles.preview}>
            <View style={styles.previewHeading}>
              <View style={styles.fileIcon}>
                <MaterialIcons color={theme.colors.brand.primary} name="description" size={24} />
              </View>
              <View style={styles.previewCopy}>
                <AppText numberOfLines={1} variant="label">{preview.fileName}</AppText>
                <AppText tone="secondary" variant="caption">
                  {preview.totalDataRows} data rows checked
                </AppText>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryValue label="Ready" value={preview.importableRecords.length} />
              <SummaryValue label="Duplicates" value={skippedCount} />
              <SummaryValue label="Errors" value={preview.issues.length} />
            </View>

            {skippedCount > 0 ? (
              <AppText tone="secondary" variant="caption">
                Duplicate words are safely skipped; existing entries are never overwritten.
              </AppText>
            ) : null}

            {preview.issues.length > 0 ? (
              <View style={styles.issueList}>
                <AppText style={styles.issueTitle} variant="label">Fix these rows first</AppText>
                {preview.issues.slice(0, 8).map((issue) => (
                  <View key={`${issue.rowNumber}-${issue.message}`} style={styles.issueRow}>
                    <AppText style={styles.issueRowNumber} variant="caption">{issue.rowNumber}</AppText>
                    <AppText style={styles.issueMessage} variant="caption">{issue.message}</AppText>
                  </View>
                ))}
                {preview.issues.length > 8 ? (
                  <AppText tone="secondary" variant="caption">
                    And {preview.issues.length - 8} more errors.
                  </AppText>
                ) : null}
              </View>
            ) : null}

            <AppButton
              disabled={preview.issues.length > 0 || preview.importableRecords.length === 0}
              label={`Import ${preview.importableRecords.length} ${preview.importableRecords.length === 1 ? 'word' : 'words'}`}
              loading={isImporting}
              onPress={() => void confirmImport()}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

async function loadAllWords(
  listWords: (options?: { limit?: number; offset?: number }) => Promise<VocabularyWord[]>,
): Promise<VocabularyWord[]> {
  const words: VocabularyWord[] = [];
  const pageSize = 200;
  for (let offset = 0; ; offset += pageSize) {
    const page = await listWords({ limit: pageSize, offset });
    words.push(...page);
    if (page.length < pageSize) return words;
  }
}

function normalizeWord(word: string): string {
  return word.normalize('NFKC').trim().toLocaleLowerCase();
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  const styles = useStyles();
  return (
    <View style={styles.sectionHeading}>
      <AppText style={styles.sectionNumber} variant="caption">{number}</AppText>
      <AppText variant="subtitle">{title}</AppText>
    </View>
  );
}

function FormatRule({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.rule}>
      <AppText style={styles.ruleLabel} variant="caption">{label.toUpperCase()}</AppText>
      <AppText style={styles.ruleValue} variant="caption">{value}</AppText>
    </View>
  );
}

function SummaryValue({ label, value }: { label: string; value: number }) {
  const styles = useStyles();
  return (
    <View style={styles.summaryValue}>
      <AppText style={styles.summaryNumber} variant="title">{value}</AppText>
      <AppText tone="secondary" variant="caption">{label}</AppText>
    </View>
  );
}

const useStyles = createThemedStyles((theme) => ({
  content: {
    gap: theme.spacing.xl,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    width: '100%',
  },
  intro: { gap: theme.spacing.sm, paddingTop: theme.spacing.sm },
  allowanceRow: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  section: { gap: theme.spacing.md },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  sectionNumber: { color: theme.colors.brand.primary, letterSpacing: 1.2 },
  ruleList: { borderTopColor: theme.colors.border.subtle, borderTopWidth: 1 },
  rule: {
    borderBottomColor: theme.colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  ruleLabel: { color: theme.colors.content.tertiary, width: 76 },
  ruleValue: { flex: 1, lineHeight: 20 },
  codeScroller: { backgroundColor: theme.colors.background.surface },
  code: {
    color: theme.colors.content.secondary,
    fontFamily: 'Courier',
    lineHeight: 21,
    padding: theme.spacing.md,
  },
  preview: {
    borderTopColor: theme.colors.brand.primary,
    borderTopWidth: 2,
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  previewHeading: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  fileIcon: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  previewCopy: { flex: 1, gap: theme.spacing.xxs },
  summaryGrid: { flexDirection: 'row' },
  summaryValue: { flex: 1, gap: theme.spacing.xxs },
  summaryNumber: { color: theme.colors.brand.primary },
  issueList: {
    backgroundColor: theme.colors.semantic.error.background,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  issueTitle: { color: theme.colors.semantic.error.foreground },
  issueRow: { flexDirection: 'row', gap: theme.spacing.sm },
  issueRowNumber: { color: theme.colors.semantic.error.foreground, width: 28 },
  issueMessage: { color: theme.colors.semantic.error.foreground, flex: 1 },
}));
