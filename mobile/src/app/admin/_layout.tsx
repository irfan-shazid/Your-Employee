import { Tabs } from 'expo-router/js-tabs';

import { tabIcon, useTabScreenOptions } from '@/components/layout/tabs';
import { useGetAdminStatsQuery } from '@/features/admin/api';

export default function AdminTabs() {
  const options = useTabScreenOptions();
  const { data } = useGetAdminStatsQuery(undefined, { pollingInterval: 60_000, skipPollingIfUnfocused: true });
  const pending = (data?.workers.PENDING ?? 0) + (data?.employers.PENDING ?? 0);

  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: tabIcon('stats-chart') }} />
      <Tabs.Screen name="approvals" options={{ title: 'Approvals', tabBarIcon: tabIcon('shield-checkmark'), tabBarBadge: pending || undefined }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments', tabBarIcon: tabIcon('wallet') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon('grid') }} />
    </Tabs>
  );
}
