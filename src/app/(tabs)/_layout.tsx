import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, Tabs } from 'expo-router';

import { useLocalData } from '@/data';
import { useAppTheme } from '@/theme';

export default function TabLayout() {
  const { settings } = useLocalData();
  const { theme } = useAppTheme();

  if (!settings.onboardingCompleted) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background.canvas },
        tabBarActiveTintColor: theme.colors.brand.primary,
        tabBarInactiveTintColor: theme.colors.content.tertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.background.surface,
          borderTopColor: theme.colors.border.subtle,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons color={color} name="home" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons color={color} name="menu-book" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <MaterialIcons color={color} name="add-circle" size={31} />,
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
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
