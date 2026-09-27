import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { AppHeader, EmptyState, ErrorState, SkeletonList, Text } from '@/components/ui';
import { useGetMeQuery } from '@/features/account/api';
import { HireSheet } from '@/features/hires/HireSheet';
import { useHireFlow } from '@/features/hires/useHireFlow';
import { ApplicantCard } from '@/features/jobs/ApplicantCard';
import { useGetApplicantsQuery, useGetJobQuery, useHireApplicantMutation } from '@/features/jobs/api';
import { useMeta } from '@/features/meta/useMeta';
import { plural } from '@/lib/format';
import { errorMessage } from '@/store/api';
import { spacing, useTheme } from '@/theme';
import type { Applicant } from '@/types/api';

/** Employer: everyone who applied to one of their jobs. */
export default function Applicants() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const job = useGetJobQuery(id).data;
  const { pricing } = useMeta();
  const credits = useGetMeQuery().data?.employer?.hireCredits ?? 0;
  const { data, isLoading, isError, error, refetch, isFetching } = useGetApplicantsQuery(id);
  const [hireApplicant, { isLoading: hiring }] = useHireApplicantMutation();
  const { hireAndPay, paying } = useHireFlow();
  const [target, setTarget] = useState<Applicant | null>(null);

  const confirmHire = async (useCredit: boolean) => {
    if (!target) return;
    const applicant = target;
    setTarget(null);
    await hireAndPay(() => hireApplicant({ id: applicant.id, jobId: id, useCredit }).unwrap(), 'Hired with a free credit — their phone number is in your hires.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="Applicants" subtitle={job?.job.title} />
      {isLoading ? (
        <View style={{ padding: spacing.xl }}>
          <SkeletonList count={3} />
        </View>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : (
        <FlashList
          data={data?.items ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, paddingTop: spacing.sm }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
          ListHeaderComponent={
            job ? (
              <Text variant="small" color="textMuted" style={{ marginBottom: spacing.md }}>
                {plural(data?.items.length ?? 0, 'applicant')} · {job.job.hiredCount}/{job.job.workersNeeded} hired
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={{ paddingBottom: spacing.md }}>
              <ApplicantCard applicant={item} jobId={id} jobOpen={job?.job.status === 'OPEN'} onHire={setTarget} />
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No applicants yet" message="Workers who match this job are being notified. Check back soon." />}
        />
      )}

      <HireSheet
        visible={Boolean(target)}
        onClose={() => setTarget(null)}
        workerName={target?.worker.fullName ?? ''}
        workerAvatar={target?.worker.avatarUrl}
        fee={pricing.hire}
        credits={credits}
        loading={hiring || paying}
        onConfirm={confirmHire}
      />
    </View>
  );
}
