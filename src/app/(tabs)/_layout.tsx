import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS, Platform, View } from 'react-native';

import { useLocalData } from '@/data';
import { useReview } from '@/features/review';
import { createThemedStyles, useAppTheme } from '@/theme';

export default function TabLayout() {
  const styles = useStyles();
  const { settings } = useLocalData();
  const { dueCount } = useReview();
  const { theme } = useAppTheme();

  if (!settings.onboardingCompleted) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (Platform.OS === 'ios') {
    return <IosNativeTabs dueCount={dueCount} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background.canvas },
        tabBarActiveTintColor: theme.colors.brand.primary,
        tabBarInactiveTintColor: theme.colors.content.tertiary,
        tabBarActiveBackgroundColor: theme.colors.brand.soft,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 1,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.background.surface,
          borderRadius: theme.radius.xl,
          borderTopWidth: 0,
          elevation: 8,
          height: 70,
          marginBottom: 10,
          marginHorizontal: 14,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: theme.colors.overlay.shadow,
          shadowOffset: { height: 5, width: 0 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        },
        tabBarItemStyle: {
          borderRadius: theme.radius.lg,
          marginHorizontal: 3,
          marginVertical: 4,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons color={color} name="home" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Words',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons color={color} name="menu-book" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: () => (
            <View style={styles.addIcon}>
              <MaterialIcons color={theme.colors.brand.onPrimary} name="add" size={27} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          tabBarBadge: dueCount > 0 ? (dueCount > 99 ? '99+' : dueCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.brand.primary,
            color: theme.colors.brand.onPrimary,
            fontSize: 10,
          },
          title: 'Review',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons color={color} name="school" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons color={color} name="settings" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

function IosNativeTabs({ dueCount }: { dueCount: number }) {
  const { theme } = useAppTheme();
  const selectedColor = DynamicColorIOS({
    dark: theme.colors.brand.primary,
    light: theme.colors.brand.primary,
  });
  const defaultColor = DynamicColorIOS({
    dark: theme.colors.content.secondary,
    light: theme.colors.content.secondary,
  });

  return (
    <NativeTabs
      blurEffect="systemDefault"
      iconColor={{ default: defaultColor, selected: selectedColor }}
      labelStyle={{
        default: { color: defaultColor, fontSize: 10, fontWeight: '500' },
        selected: { color: selectedColor, fontSize: 10, fontWeight: '600' },
      }}
      tintColor={selectedColor}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon sf={{ default: 'book.closed', selected: 'book.closed.fill' }} />
        <NativeTabs.Trigger.Label>Words</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="add">
        <NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} />
        <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'graduationcap', selected: 'graduationcap.fill' }}
        />
        <NativeTabs.Trigger.Label>Review</NativeTabs.Trigger.Label>
        {dueCount > 0 ? (
          <NativeTabs.Trigger.Badge>
            {dueCount > 99 ? '99+' : String(dueCount)}
          </NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const useStyles = createThemedStyles((theme) => ({
  addIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.radius.pill,
    height: 42,
    justifyContent: 'center',
    marginTop: -8,
    width: 42,
  },
}));
