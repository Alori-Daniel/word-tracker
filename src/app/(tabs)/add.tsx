import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, View } from 'react-native';

import { AppText, Card, PageHeader, Screen } from '@/components/ui';
import { createThemedStyles, useAppTheme } from '@/theme';

const CAPABILITIES = [
  { icon: 'edit-note' as const, label: 'Add a word and its definition' },
  { icon: 'category' as const, label: 'Choose a category' },
  { icon: 'notes' as const, label: 'Capture an example or personal note' },
] as const;

export default function AddScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          description="Capture a word while it is fresh, then give it context."
          eyebrow="Quick capture"
          title="Add a word"
        />

        <Card style={styles.card}>
          <View style={styles.iconContainer}>
            <MaterialIcons color={theme.colors.brand.primary} name="add-circle" size={34} />
          </View>
          <View style={styles.copy}>
            <AppText variant="subtitle">Word entry is the next build step</AppText>
            <AppText tone="secondary">
              This navigation destination is ready. The complete validated entry form will be added
              in the vocabulary-management stage.
            </AppText>
          </View>

          <View style={styles.capabilityList}>
            {CAPABILITIES.map((capability) => (
              <View key={capability.label} style={styles.capabilityRow}>
                <MaterialIcons
                  color={theme.colors.content.secondary}
                  name={capability.icon}
                  size={21}
                />
                <AppText style={styles.capabilityText}>{capability.label}</AppText>
              </View>
            ))}
          </View>
        </Card>
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
  card: {
    gap: theme.spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.soft,
    borderRadius: theme.radius.pill,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  copy: {
    gap: theme.spacing.xs,
  },
  capabilityList: {
    borderTopColor: theme.colors.border.subtle,
    borderTopWidth: 1,
    gap: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  capabilityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  capabilityText: {
    flex: 1,
  },
}));
