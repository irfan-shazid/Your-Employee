import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { SearchField } from '@/components/form/SearchField';
import { ChipFilter } from '@/components/lists/ChipFilter';
import { InfiniteList } from '@/components/lists/InfiniteList';
import { AppHeader, EmptyState, Segmented } from '@/components/ui';
import { useGetAdminEmployersInfiniteQuery, useGetAdminStatsQuery, useGetAdminWorkersInfiniteQuery } from '@/features/admin/api';
import { QueueRow, toQueueItem, type QueueItem } from '@/features/admin/rows';
import { useDebounced } from '@/hooks/useDebounced';
import { spacing, useTheme } from '@/theme';
import type { ApprovalStatus } from '@/types/api';

type Kind = 'workers' | 'employers';

const STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
] as const;

/** Admin review queue for worker and employer profiles. */
export default function Approvals() {
  const { colors } = useTheme();
  const [kind, setKind] = useState<Kind>('workers');
  const [status, setStatus] = useState<ApprovalStatus>('PENDING');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const stats = useGetAdminStatsQuery().data;

  const args = { status, q: q || undefined };
  const workers = useGetAdminWorkersInfiniteQuery(args, { skip: kind !== 'workers' });
  const employers = useGetAdminEmployersInfiniteQuery(args, { skip: kind !== 'employers' });
  const source = kind === 'workers' ? workers : employers;

  // Both queues render the same row; map each page to the shared shape once per change.
  const pages = source.data?.pages;
  const data = useMemo(
    () =>
      pages && {
        pages: pages.map((page) => ({
          items: page.items.map((p): QueueItem => ('categories' in p ? toQueueItem.worker(p) : toQueueItem.employer(p))),
        })),
      },
    [pages],
  );
  const query = { ...source, data };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="Approvals" large back={false} subtitle="Verify new workers and employers" />
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.md }}>
        <Segmented<Kind>
          value={kind}
          onChange={setKind}
          options={[
            { value: 'workers', label: 'Workers', count: stats?.workers.PENDING || undefined },
            { value: 'employers', label: 'Employers', count: stats?.employers.PENDING || undefined },
          ]}
        />
        <SearchField value={search} onChangeText={setSearch} placeholder="Search name, phone or NID" />
        <ChipFilter options={STATUSES} value={status} onChange={setStatus} />
      </View>

      <InfiniteList
        query={query}
        gap={spacing.sm}
        skeletons={4}
        renderItem={(item) => <QueueRow item={item} />}
        empty={
          <EmptyState
            icon={status === 'PENDING' ? 'checkmark-done-circle-outline' : 'search-outline'}
            title={status === 'PENDING' ? 'All caught up' : 'Nothing here'}
            message={status === 'PENDING' ? 'No profiles are waiting for review.' : 'No profiles match this filter.'}
          />
        }
      />
    </View>
  );
}
