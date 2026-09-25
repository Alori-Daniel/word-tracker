const APP_SCHEME = 'vocabularyvault';

function route(path: string): string {
  return `${APP_SCHEME}://${path.replace(/^\/+/, '')}`;
}

export const vocabularyWidgetLinks = {
  addWord: route('add'),
  library: route('library'),
  review: route('review'),
  editWord: (id: string) => route(`word/${encodeURIComponent(id)}/edit`),
  openWord: (id: string) => route(`word/${encodeURIComponent(id)}`),
} as const;
