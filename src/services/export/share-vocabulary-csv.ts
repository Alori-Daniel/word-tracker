import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function shareVocabularyCsv(csv: string, now = new Date()): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.');
  }

  const date = now.toISOString().slice(0, 10);
  const file = new File(Paths.cache, `wordecho-vocabulary-${date}.csv`);
  file.create({ overwrite: true });
  file.write(csv);

  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Export WordEcho vocabulary',
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
