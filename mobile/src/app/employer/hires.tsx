import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { InfiniteList, usePagedItems } from '@/components/lists/InfiniteList';
import { AppHeader, EmptyState, Segmented } from '@/components/ui';
import { HireCard } from '@/features/hires/HireCard';
import { useGetHiresInfiniteQuery } from '@/features/hires/api';
import { spacing, useTheme } from '@/theme';
import type { Hire } from '@/types/api';

type Filter = 'current' | 'past' | 'all';

const FILTERS: Record<Filter, ((h: Hire) => boolean) | undefined> = {
  current: (h) => h.status === 'PENDING_PAYMENT' || h.status === 'OFFERED' || h.status === 'ACTIVE',
  past: (h) => h.status === 'COMPLETED' || h.status === 'DECLINED' || h.status === 'CANCELLED',
  all: undefined,
};

/** Employer: everyone they've hired or made an offer to. */
export default function EmployerHires() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('current');
  const hires = useGetHiresInfiniteQuery({});
  const current = usePagedItems(hires, FILTERS.current).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="Hires" large back={false} subtitle="People you've hired or made offers to" />
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'current', label: 'Current', count: current || undefined },
            { value: 'past', label: 'Past' },
            { value: 'all', label: 'All' },
          ]}
        />
      </View>
      <InfiniteList
        query={hires}
        filter={FILTERS[filter]}
        renderItem={(hire) => <HireCard hire={hire} viewer="EMPLOYER" />}
        empty={
          <EmptyState
            icon="people-outline"
            title="No hires here"
            message="Hire from your job applicants, or find a worker directly."
            actionLabel="Find workers"
            onAction={() => router.push('/workers')}
          />
        }
      />
    </View>
  );
}
