import { Tabs } from 'expo-router/js-tabs';

import { tabIcon, useTabScreenOptions } from '@/components/layout/tabs';
import { useUnreadBadge } from '@/features/notifications/api';

export default function EmployerTabs() {
  const options = useTabScreenOptions();
  const badge = useUnreadBadge();

  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="jobs" options={{ title: 'My jobs', tabBarIcon: tabIcon('briefcase') }} />
      <Tabs.Screen name="hires" options={{ title: 'Hires', tabBarIcon: tabIcon('people') }} />
      <Tabs.Screen
        name="alerts"
        options={{ title: 'Alerts', tabBarIcon: tabIcon('notifications'), tabBarBadge: badge }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
