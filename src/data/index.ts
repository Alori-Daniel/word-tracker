export { LocalDataProvider, useLocalData } from './local-data-provider';
export { DuplicateCategoryError } from './repositories/category-repository';
export { CsvImportLimitError } from './repositories/csv-import-repository';
export { DuplicateWordError } from './repositories/word-repository';
export { AccountMismatchError } from './repositories/guest-identity-repository';
export type { LocalRepositories } from './repositories/create-repositories';
export { LocalVaultChangedDuringSyncError } from './repositories/vault-sync-repository';
