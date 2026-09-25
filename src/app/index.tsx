import { Redirect } from 'expo-router';

import { useLocalData } from '@/data';

export default function EntryRoute() {
  const { settings } = useLocalData();

  return (
    <Redirect href={settings.onboardingCompleted ? '/(tabs)' : '/(onboarding)/welcome'} />
  );
}
