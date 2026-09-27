import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { SearchField } from '@/components/form/SearchField';
import { ChipFilter } from '@/components/lists/ChipFilter';
import { InfiniteList } from '@/components/lists/InfiniteList';
import { AppHeader, Button, EmptyState, Input, Sheet } from '@/components/ui';
import { useGetAdminJobsInfiniteQuery, useRemoveJobMutation } from '@/features/admin/api';
import { JobCard } from '@/features/jobs/JobCard';
import { useDebounced } from '@/hooks/useDebounced';
import { errorMessage } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import { spacing, useTheme } from '@/theme';
import type { JobStatus } from '@/types/api';

const STATUSES = [
  { value: undefined, label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'FILLED', label: 'Filled' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'PENDING_PAYMENT', label: 'Unpaid' },
  { value: 'REMOVED', label: 'Removed' },
] as const;

/** Admin job moderation: remove posts that break the rules (the employer is told why). */
export default function ModerateJobs() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<JobStatus | undefined>('OPEN');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const jobs = useGetAdminJobsInfiniteQuery({ status, q: q || undefined });
  const [removeJob, { isLoading }] = useRemoveJobMutation();
  const [target, setTarget] = useState<{ id: string; title: string } | null>(null);
  const [reason, setReason] = useState('');

  const remove = async () => {
    if (!target) return;
    try {
      await removeJob({ id: target.id, reason: reason.trim() }).unwrap();
      setTarget(null);
      setReason('');
      dispatch(toast('success', 'Job removed', 'The employer has been notified.'));
    } catch (err) {
      dispatch(toast('error', "Couldn't remove job", errorMessage(err)));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="Jobs" subtitle="Remove posts that break the rules" />
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.md }}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search job titles" />
        <ChipFilter options={STATUSES} value={status} onChange={setStatus} />
      </View>
      <InfiniteList
        query={jobs}
        renderItem={(job) => (
          <View style={{ gap: spacing.sm }}>
            <JobCard job={job} showStatus onPress={() => router.push(`/jobs/${job.id}`)} />
            {job.status !== 'REMOVED' ? (
              <Button title="Remove post" icon="trash-outline" variant="dangerSoft" size="sm" onPress={() => setTarget({ id: job.id, title: job.title })} />
            ) : null}
          </View>
        )}
        empty={<EmptyState icon="megaphone-outline" title="No jobs" message="No job posts match this filter." />}
      />

      <Sheet visible={Boolean(target)} onClose={() => setTarget(null)} title="Remove this job?" subtitle={target?.title}>
        <View style={{ gap: spacing.lg }}>
          <Input
            label="Reason (sent to the employer)"
            multiline
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Wage below legal minimum, misleading description…"
            maxLength={300}
          />
          <Button title="Remove job" variant="danger" onPress={remove} loading={isLoading} disabled={reason.trim().length < 3} />
        </View>
      </Sheet>
    </View>
  );
}
