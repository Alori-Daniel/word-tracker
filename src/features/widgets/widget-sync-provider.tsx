import { type PropsWithChildren, useEffect } from 'react';

import { useLocalData } from '@/data';
import { useVocabulary } from '@/features/vocabulary';
import {
  createVocabularyWidgetSnapshot,
  syncVocabularyWidget,
} from '@/services/widgets';

export function WidgetSyncProvider({ children }: PropsWithChildren) {
  const { settings } = useLocalData();
  const { categories, listWords, revision } = useVocabulary();

  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const words = await listWords({ limit: 200 });
          if (isCancelled) return;

          const snapshot = createVocabularyWidgetSnapshot(
            words,
            categories,
            settings.widgetPreferences,
          );
          await syncVocabularyWidget(snapshot);
        } catch (error) {
          // Widget refresh failures must never block access to the local vault.
          void error;
        }
      })();
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [categories, listWords, revision, settings.widgetPreferences]);

  return children;
}
