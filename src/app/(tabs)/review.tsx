import { ScrollView } from 'react-native';

import { EmptyState, PageHeader, Screen } from '@/components/ui';
import { createThemedStyles } from '@/theme';

export default function ReviewScreen() {
  const styles = useStyles();

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          description="Strengthen your vocabulary with short, focused practice."
          eyebrow="Make it stick"
          title="Review"
        />
        <EmptyState
          description="Save a few words first. Your review queue will appear here when there is something to practice."
          icon="school"
          title="Nothing to review yet"
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
