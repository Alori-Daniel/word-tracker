import type { CreateWordInput } from './vocabulary';

export type CsvWordImportRecord = {
  categoryName: string | null;
  input: Omit<CreateWordInput, 'categoryId'>;
  rowNumber: number;
};

export type CsvImportIssue = {
  message: string;
  rowNumber: number;
};

export type CsvImportPreview = {
  duplicateRows: number[];
  ignoredEmptyRows: number;
  issues: CsvImportIssue[];
  records: CsvWordImportRecord[];
  totalDataRows: number;
};
