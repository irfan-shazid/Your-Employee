import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Input, Sheet } from '@/components/ui';
import { useGetMeQuery } from '@/features/account/api';
import { usePayment } from '@/features/payments/usePayment';
import { confirm } from '@/lib/confirm';
import { taka } from '@/lib/format';
import { errorCode, errorMessage } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import { spacing } from '@/theme';
import type { JobDetail } from '@/types/api';
import { useApplyToJobMutation, useDeleteJobMutation, useSetJobOpenMutation, useWithdrawApplicationMutation } from './api';

/**
 * Footer actions for a job, depending on who is looking:
 * the owner pays / closes / reopens / views applicants; a worker applies or withdraws.
 */
export function JobActionBar({ detail }: { detail: JobDetail }) {
  const { job, isOwner, myApplication, fee } = detail;
  const me = useGetMeQuery().data;

  if (isOwner) return <OwnerActions jobId={job.id} status={job.status} applicants={job.applicationsCount} fee={fee} />;
  if (me?.user.role !== 'WORKER') return null;

  if (myApplication?.hireId) {
    return <Button title="View hire details" icon="ribbon" onPress={() => router.push(`/hires/${myApplication.hireId}`)} />;
  }
  if (myApplication && (myApplication.status === 'PENDING' || myApplication.status === 'SHORTLISTED')) {
    return <WithdrawButton applicationId={myApplication.id} jobId={job.id} />;
  }
  if (myApplication && myApplication.status !== 'WITHDRAWN') return null;
  if (job.status !== 'OPEN') return null;

  return me.worker?.subscriptionActive ? (
    <ApplyButton jobId={job.id} jobTitle={job.title} />
  ) : (
    <Button title="Activate plan to apply" icon="flash" onPress={() => router.push('/subscription')} />
  );
}

function OwnerActions({ jobId, status, applicants, fee }: { jobId: string; status: JobDetail['job']['status']; applicants: number; fee: number }) {
  const dispatch = useAppDispatch();
  const { pay, paying } = usePayment();
  const [setOpen, { isLoading }] = useSetJobOpenMutation();
  const [deleteJob] = useDeleteJobMutation();
  const viewApplicants = () => router.push(`/jobs/${jobId}/applicants`);

  const toggle = async (open: boolean) => {
    if (!open && !(await confirm({ title: 'Close this job?', message: 'Workers will no longer be able to apply.', confirmText: 'Close job' }))) return;
    try {
      await setOpen({ id: jobId, open }).unwrap();
      dispatch(toast('success', open ? 'Job reopened' : 'Job closed'));
    } catch (err) {
      dispatch(toast('error', "Couldn't update the job", errorMessage(err)));
    }
  };

  const removeDraft = async () => {
    if (!(await confirm({ title: 'Delete this draft?', confirmText: 'Delete', destructive: true }))) return;
    await deleteJob(jobId).unwrap().catch(() => {});
    router.back();
  };

  if (status === 'PENDING_PAYMENT') {
    return (
      <>
        <Button title={`Pay ${taka(fee)} & publish`} icon="card-outline" onPress={() => pay('JOB_POST', jobId)} loading={paying} />
        <Button title="Delete draft" variant="ghost" size="md" onPress={removeDraft} />
      </>
    );
  }
  if (status === 'REMOVED') return null;

  const isOpen = status === 'OPEN' || status === 'FILLED';
  return (
    <View style={styles.row}>
      <Button title={isOpen ? 'Close' : 'Reopen'} variant="outline" style={{ flex: 1 }} onPress={() => toggle(!isOpen)} loading={isLoading} />
      <Button title={isOpen ? `Applicants · ${applicants}` : 'Applicants'} icon="people" style={{ flex: 2 }} onPress={viewApplicants} />
    </View>
  );
}

function WithdrawButton({ applicationId, jobId }: { applicationId: string; jobId: string }) {
  const dispatch = useAppDispatch();
  const [withdraw, { isLoading }] = useWithdrawApplicationMutation();

  const onPress = async () => {
    if (!(await confirm({ title: 'Withdraw application?', confirmText: 'Withdraw', destructive: true }))) return;
    try {
      await withdraw({ id: applicationId, jobId }).unwrap();
      dispatch(toast('info', 'Application withdrawn'));
    } catch (err) {
      dispatch(toast('error', "Couldn't withdraw", errorMessage(err)));
    }
  };

  return <Button title="Withdraw application" variant="dangerSoft" onPress={onPress} loading={isLoading} />;
}

function ApplyButton({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const dispatch = useAppDispatch();
  const [apply, { isLoading }] = useApplyToJobMutation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    try {
      await apply({ jobId, message: message.trim() || undefined }).unwrap();
      setOpen(false);
      setMessage('');
      dispatch(toast('success', 'Application sent', 'The employer will be notified right away.'));
    } catch (err) {
      setOpen(false);
      if (errorCode(err) === 'SUBSCRIPTION_REQUIRED') router.push('/subscription');
      else dispatch(toast('error', "Couldn't apply", errorMessage(err)));
    }
  };

  return (
    <>
      <Button title="Apply now" icon="paper-plane" onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title="Apply for this job" subtitle={jobTitle}>
        <View style={{ gap: spacing.lg }}>
          <Input
            label="Message to employer"
            optional
            multiline
            value={message}
            onChangeText={setMessage}
            placeholder="Introduce yourself — experience, tools you have, when you can start…"
            maxLength={500}
          />
          <Button title="Send application" icon="paper-plane" onPress={submit} loading={isLoading} />
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
});
