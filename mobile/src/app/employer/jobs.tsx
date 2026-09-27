import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { InfiniteList, usePagedItems } from '@/components/lists/InfiniteList';
import { AppHeader, EmptyState, IconButton, Segmented } from '@/components/ui';
import { useGetMyJobsInfiniteQuery } from '@/features/jobs/api';
import { JobCard } from '@/features/jobs/JobCard';
import { spacing, useTheme } from '@/theme';
import type { Job } from '@/types/api';

type Filter = 'live' | 'unpaid' | 'closed';

const FILTERS: Record<Filter, (job: Job) => boolean> = {
  live: (j) => j.status === 'OPEN',
  unpaid: (j) => j.status === 'PENDING_PAYMENT',
  closed: (j) => j.status === 'FILLED' || j.status === 'CLOSED',
};

const EMPTY: Record<Filter, { icon: 'megaphone-outline' | 'card-outline' | 'archive-outline'; title: string; message: string }> = {
  live: { icon: 'megaphone-outline', title: 'No live jobs', message: 'Post a job to start receiving applications from verified workers.' },
  unpaid: { icon: 'card-outline', title: 'Nothing unpaid', message: 'Jobs waiting for payment will show up here.' },
  closed: { icon: 'archive-outline', title: 'No closed jobs', message: 'Filled and closed jobs will be kept here.' },
};

/** Employer: all posted jobs, grouped by state. */
export default function MyJobs() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('live');
  const jobs = useGetMyJobsInfiniteQuery({});
  const live = usePagedItems(jobs, FILTERS.live).length;
  const unpaid = usePagedItems(jobs, FILTERS.unpaid).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader
        title="My jobs"
        large
        back={false}
        right={<IconButton icon="add" variant="primary" accessibilityLabel="Post a job" onPress={() => router.push('/jobs/new')} />}
      />
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'live', label: 'Live', count: live || undefined },
            { value: 'unpaid', label: 'Unpaid', count: unpaid || undefined },
            { value: 'closed', label: 'Closed' },
          ]}
        />
      </View>
      <InfiniteList
        query={jobs}
        filter={FILTERS[filter]}
        renderItem={(job) => <JobCard job={job} showStatus />}
        empty={
          <EmptyState
            {...EMPTY[filter]}
            actionLabel={filter === 'live' ? 'Post a job' : undefined}
            onAction={() => router.push('/jobs/new')}
          />
        }
      />
    </View>
  );
}
