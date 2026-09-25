import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { EmptyState, PageHeader, Screen } from '@/components/ui';
import { createThemedStyles } from '@/theme';

export default function LibraryScreen() {
  const styles = useStyles();

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          description="Search, filter, and revisit every word you have saved."
          eyebrow="Your collection"
          title="Library"
        />
        <EmptyState
          actionLabel="Add a word"
          description="Words you save will appear here, ready to search and organize."
          icon="menu-book"
          onAction={() => router.push('/(tabs)/add')}
          title="Your library is waiting"
        />
      </ScrollView>
    </Screen>
  );
}

const useStyles = createThemedStyles((theme) => ({
  content: {
    flexGrow: 1,
    gap: theme.spacing.xl,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    width: '100%',
  },
}));
