import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { InfiniteList, usePagedItems } from '@/components/lists/InfiniteList';
import { AppHeader, EmptyState, Segmented } from '@/components/ui';
import { HireCard } from '@/features/hires/HireCard';
import { useGetHiresInfiniteQuery } from '@/features/hires/api';
import { ApplicationCard } from '@/features/jobs/ApplicationCard';
import { useGetMyApplicationsInfiniteQuery } from '@/features/jobs/api';
import { spacing, useTheme } from '@/theme';
import type { Hire } from '@/types/api';

type Tab = 'hires' | 'applications';
const isOffer = (h: Hire) => h.status === 'OFFERED';

/** Worker: offers & hires, and the jobs they applied to. */
export default function MyWork() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('hires');
  const hires = useGetHiresInfiniteQuery({});
  const applications = useGetMyApplicationsInfiniteQuery(undefined, { skip: tab !== 'applications' });
  const offers = usePagedItems(hires, isOffer).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="My work" large back={false} subtitle="Offers, hires and applications" />
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'hires', label: 'Hires & offers', count: offers || undefined },
            { value: 'applications', label: 'Applications' },
          ]}
        />
      </View>

      {tab === 'hires' ? (
        <InfiniteList
          query={hires}
          renderItem={(hire) => <HireCard hire={hire} viewer="WORKER" />}
          empty={
            <EmptyState
              icon="ribbon-outline"
              title="No hires yet"
              message="When an employer hires you or sends you an offer, it will appear here."
              actionLabel="Find work"
              onAction={() => router.navigate('/worker')}
            />
          }
        />
      ) : (
        <InfiniteList
          query={applications}
          renderItem={(application) => <ApplicationCard application={application} />}
          empty={
            <EmptyState
              icon="paper-plane-outline"
              title="No applications yet"
              message="Apply to jobs that match your skills. Employers will review and hire."
              actionLabel="Browse jobs"
              onAction={() => router.navigate('/worker')}
            />
          }
        />
      )}
    </View>
  );
}
