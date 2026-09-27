import { Tabs } from 'expo-router/js-tabs';

import { tabIcon, useTabScreenOptions } from '@/components/layout/tabs';
import { useUnreadBadge } from '@/features/notifications/api';

export default function WorkerTabs() {
  const options = useTabScreenOptions();
  const badge = useUnreadBadge();

  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen name="index" options={{ title: 'Find work', tabBarIcon: tabIcon('search') }} />
      <Tabs.Screen name="activity" options={{ title: 'My work', tabBarIcon: tabIcon('briefcase') }} />
      <Tabs.Screen
        name="alerts"
        options={{ title: 'Alerts', tabBarIcon: tabIcon('notifications'), tabBarBadge: badge }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
