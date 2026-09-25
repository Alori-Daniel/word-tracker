import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import type { LocalSettings } from '@/domain/settings';
import type { GuestIdentity } from '@/domain/vocabulary';
import { darkColors, lightColors } from '@/theme/colors';

import { DATABASE_NAME } from './database/constants';
import { initializeDatabase } from './database/initialize-database';
import { DATABASE_VERSION } from './database/migrations';
import {
  createBootstrapRepositories,
  createRepositories,
  type LocalRepositories,
} from './repositories/create-repositories';

type LocalDataContextValue = {
  identity: GuestIdentity;
  settings: LocalSettings;
  repositories: LocalRepositories;
  databaseVersion: number;
  categoryCount: number;
  wordCount: number;
};

type BootstrapState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; value: LocalDataContextValue };

const LocalDataContext = createContext<LocalDataContextValue | null>(null);

export function LocalDataProvider({ children }: PropsWithChildren) {
  const [databaseError, setDatabaseError] = useState<Error | null>(null);
  const [databaseAttempt, setDatabaseAttempt] = useState(0);

  if (databaseError) {
    return (
      <InitializationState
        error={databaseError}
        onRetry={() => {
          setDatabaseError(null);
          setDatabaseAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      key={databaseAttempt}
      onError={setDatabaseError}
      onInit={initializeDatabase}
    >
      <LocalDataBootstrap>{children}</LocalDataBootstrap>
    </SQLiteProvider>
  );
}

function LocalDataBootstrap({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<BootstrapState>({ status: 'loading' });

  useEffect(() => {
    let isActive = true;

    async function bootstrap() {
      setState({ status: 'loading' });

      try {
        const bootstrapRepositories = createBootstrapRepositories(database);
        const identity = await bootstrapRepositories.identity.getOrCreate();
        const repositories = createRepositories(database, identity);

        await repositories.categories.seedDefaults();

        const [settings, categories, wordCount] = await Promise.all([
          repositories.settings.getAll(),
          repositories.categories.list(),
          repositories.words.count(),
        ]);

        if (isActive) {
          setState({
            status: 'ready',
            value: {
              identity,
              settings,
              repositories,
              databaseVersion: DATABASE_VERSION,
              categoryCount: categories.length,
              wordCount,
            },
          });
        }
      } catch (error) {
        if (isActive) {
          setState({
            status: 'error',
            error: error instanceof Error ? error : new Error('Local data initialization failed.'),
          });
        }
      }
    }

    void bootstrap();

    return () => {
      isActive = false;
    };
  }, [attempt, database]);

  if (state.status === 'loading') {
    return <InitializationState />;
  }

  if (state.status === 'error') {
    return <InitializationState error={state.error} onRetry={() => setAttempt((value) => value + 1)} />;
  }

  return <LocalDataContext.Provider value={state.value}>{children}</LocalDataContext.Provider>;
}

function InitializationState({ error, onRetry }: { error?: Error; onRetry?: () => void }) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const dynamicStyles = useMemo(
    () => ({
      screen: { backgroundColor: colors.background.canvas },
      title: { color: colors.content.primary },
      message: { color: colors.content.secondary },
      button: { backgroundColor: colors.brand.primary },
      buttonLabel: { color: colors.brand.onPrimary },
    }),
    [colors],
  );

  return (
    <View style={[styles.initializationScreen, dynamicStyles.screen]}>
      {error ? (
        <>
          <Text style={[styles.initializationTitle, dynamicStyles.title]}>Vault unavailable</Text>
          <Text style={[styles.initializationMessage, dynamicStyles.message]}>
            Your local data could not be opened. Nothing has been deleted.
          </Text>
          {onRetry ? (
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={[styles.retryButton, dynamicStyles.button]}
            >
              <Text style={[styles.retryButtonLabel, dynamicStyles.buttonLabel]}>Try again</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.brand.primary} size="large" />
          <Text style={[styles.initializationTitle, dynamicStyles.title]}>Opening your vault…</Text>
        </>
      )}
    </View>
  );
}

export function useLocalData(): LocalDataContextValue {
  const value = useContext(LocalDataContext);

  if (!value) {
    throw new Error('useLocalData must be used within LocalDataProvider.');
  }

  return value;
}

const styles = StyleSheet.create({
  initializationScreen: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 32,
  },
  initializationTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  initializationMessage: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 360,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  retryButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
