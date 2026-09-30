import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { AppText, EmptyState, Screen } from '@/components/ui';
import { LEARNING_STATUSES, type LearningStatus } from '@/domain/vocabulary';
import { useVocabulary, useWordList, WordListItem } from '@/features/vocabulary';
import { createThemedStyles, useAppTheme } from '@/theme';

type StatusFilter = LearningStatus | undefined;

export default function LibraryScreen() {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { categories, wordCount } = useVocabulary();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>();
  const [categoryId, setCategoryId] = useState<string>();
  const { error, hasMore, isLoading, isLoadingMore, loadMore, reload, words } = useWordList({
    categoryId,
    query,
    status,
  });
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const hasFilters = Boolean(query.trim() || status || categoryId);

  const header = (
    <View style={styles.headerContent}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <AppText style={styles.pageTitle} variant="editorial">Your words</AppText>
          <AppText tone="secondary" variant="caption">
            {wordCount} SAVED · {categories.length} {categories.length === 1 ? 'CATEGORY' : 'CATEGORIES'}
          </AppText>
        </View>
        <Pressable
          accessibilityLabel="Add a word"
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/add')}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <MaterialIcons color={theme.colors.brand.onPrimary} name="add" size={25} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <MaterialIcons color={theme.colors.content.tertiary} name="search" size={22} />
        <TextInput
          accessibilityLabel="Search vocabulary"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Search your words"
          placeholderTextColor={theme.colors.content.tertiary}
          returnKeyType="search"
          selectionColor={theme.colors.brand.primary}
          style={styles.searchInput}
          value={query}
        />
        {query ? (
          <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery('')}>
            <MaterialIcons color={theme.colors.content.tertiary} name="cancel" size={20} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.filterRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <FilterChip label="All" onPress={() => setStatus(undefined)} selected={!status} />
        {LEARNING_STATUSES.map((item) => (
          <FilterChip
            key={item}
            label={item[0].toUpperCase() + item.slice(1)}
            onPress={() => setStatus(item)}
            selected={status === item}
          />
        ))}
      </ScrollView>

      {categories.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.filterRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <FilterChip
            label="Every category"
            onPress={() => setCategoryId(undefined)}
            selected={!categoryId}
          />
          {categories.map((category) => (
            <FilterChip
              color={category.color}
              key={category.id}
              label={category.name}
              onPress={() => setCategoryId(category.id)}
              selected={categoryId === category.id}
            />
          ))}
        </ScrollView>
      ) : null}

      {!isLoading && words.length > 0 ? (
        <AppText tone="tertiary" variant="caption">
          {words.length}
          {hasMore ? '+' : ''} {words.length === 1 && !hasMore ? 'WORD' : 'WORDS'}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Screen edges={['top', 'right', 'left']}>
      <FlatList
        contentContainerStyle={styles.content}
        data={words}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(word) => word.id}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={theme.colors.brand.primary} size="large" />
          ) : error ? (
            <EmptyState
              actionLabel="Try again"
              description="Your local vault could not be read. Nothing has been removed."
              icon="error-outline"
              onAction={reload}
              title="Could not load your words"
            />
          ) : (
            <EmptyState
              actionLabel={hasFilters ? undefined : 'Add a word'}
              description={
                hasFilters
                  ? 'Try a different search or clear one of the filters.'
                  : 'Words you save will appear here, ready to search and organize.'
              }
              icon={hasFilters ? 'search-off' : 'menu-book'}
              onAction={hasFilters ? undefined : () => router.push('/(tabs)/add')}
              title={hasFilters ? 'No matching words' : 'Your library is waiting'}
            />
          )
        }
        ListHeaderComponent={header}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator
              color={theme.colors.brand.primary}
              size="small"
              style={styles.listFooter}
            />
          ) : null
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            onRefresh={reload}
            refreshing={isLoading && wordCount > 0}
            tintColor={theme.colors.brand.primary}
          />
        }
        renderItem={({ item }) => (
          <WordListItem
            category={item.categoryId ? categoryById.get(item.categoryId) : undefined}
            onPress={() => router.push({ pathname: '/word/[id]', params: { id: item.id } })}
            word={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function FilterChip({
  color,
  label,
  onPress,
  selected,
}: {
  color?: string;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filterChip, selected && styles.filterChipSelected]}
    >
      {color ? <View style={[styles.filterDot, { backgroundColor: color }]} /> : null}
      <AppText style={selected && styles.filterChipTextSelected} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = createThemedStyles((theme) => ({
  content: {
    flexGrow: 1,
    marginHorizontal: 'auto',
    maxWidth: 720,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    width: '100%',
  },
  headerContent: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  titleCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  pageTitle: {
    fontSize: 38,
    lineHeight: 44,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.radius.pill,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  pressed: {
    opacity: 0.7,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 50,
    paddingHorizontal: theme.spacing.md,
  },
  searchInput: {
    color: theme.colors.content.primary,
    flex: 1,
    fontSize: 16,
    minHeight: 48,
  },
  filterRow: {
    gap: theme.spacing.xs,
    paddingRight: theme.spacing.md,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    minHeight: 38,
    paddingHorizontal: theme.spacing.md,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.brand.soft,
  },
  filterChipTextSelected: {
    color: theme.colors.brand.primary,
  },
  filterDot: {
    borderRadius: theme.radius.pill,
    height: 8,
    width: 8,
  },
  separator: {
    height: theme.spacing.sm,
  },
  listFooter: {
    marginTop: theme.spacing.lg,
  },
}));
