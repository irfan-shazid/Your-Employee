import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Input, Sheet, StarInput } from '@/components/ui';
import { usePayment } from '@/features/payments/usePayment';
import { confirm } from '@/lib/confirm';
import { taka } from '@/lib/format';
import { errorMessage } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import { spacing } from '@/theme';
import type { Hire } from '@/types/api';
import { useHireActionMutation, useReviewHireMutation } from './api';

type Props = { hire: Hire; viewer: 'EMPLOYER' | 'WORKER' | 'ADMIN'; fee: number };

/** Footer actions for a hire: the worker answers offers; the employer pays, completes, cancels and reviews. */
export function HireActionBar({ hire, viewer, fee }: Props) {
  if (viewer === 'EMPLOYER') return <EmployerActions hire={hire} fee={fee} />;
  if (viewer === 'WORKER' && hire.status === 'OFFERED') return <OfferResponse hire={hire} />;
  return null;
}

function useRunner() {
  const dispatch = useAppDispatch();
  return async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      dispatch(toast('success', success));
      return true;
    } catch (err) {
      dispatch(toast('error', 'Something went wrong', errorMessage(err)));
      return false;
    }
  };
}

function OfferResponse({ hire }: { hire: Hire }) {
  const run = useRunner();
  const [act, { isLoading }] = useHireActionMutation();
  const ref = { id: hire.id, workerId: hire.worker.id };

  const decline = async () => {
    if (!(await confirm({ title: 'Decline this offer?', message: 'The employer will be notified.', confirmText: 'Decline', destructive: true }))) return;
    run(() => act({ ...ref, action: 'decline' }).unwrap(), 'Offer declined');
  };

  return (
    <View style={styles.row}>
      <Button title="Decline" variant="outline" style={{ flex: 1 }} onPress={decline} />
      <Button
        title="Accept offer"
        icon="checkmark"
        style={{ flex: 2 }}
        loading={isLoading}
        onPress={() => run(() => act({ ...ref, action: 'accept' }).unwrap(), 'Offer accepted 🎉')}
      />
    </View>
  );
}

function EmployerActions({ hire, fee }: { hire: Hire; fee: number }) {
  const run = useRunner();
  const { pay, paying } = usePayment();
  const [act, { isLoading }] = useHireActionMutation();
  const [reviewOpen, setReviewOpen] = useState(false);
  const ref = { id: hire.id, workerId: hire.worker.id };

  const cancel = async () => {
    const message =
      hire.status === 'OFFERED'
        ? 'You’ll get a free hire credit back to use on your next hire.'
        : hire.status === 'ACTIVE'
          ? 'The hiring fee is not refundable once the worker has accepted.'
          : undefined;
    if (!(await confirm({ title: 'Cancel this hire?', message, confirmText: 'Cancel hire', destructive: true }))) return;
    run(() => act({ ...ref, action: 'cancel' }).unwrap(), 'Hire cancelled');
  };

  const complete = async () => {
    if (!(await confirm({ title: 'Mark as completed?', message: 'Confirm the work is finished. You can then leave a review.', confirmText: 'Completed' }))) return;
    if (await run(() => act({ ...ref, action: 'complete' }).unwrap(), 'Marked as completed')) setReviewOpen(true);
  };

  let buttons = null;
  if (hire.status === 'PENDING_PAYMENT') {
    buttons = (
      <>
        <Button title={`Pay ${taka(fee)} to confirm hire`} icon="card-outline" onPress={() => pay('HIRE', hire.id)} loading={paying} />
        <Button title="Cancel" variant="ghost" size="md" onPress={cancel} />
      </>
    );
  } else if (hire.status === 'OFFERED') {
    buttons = <Button title="Cancel offer" variant="dangerSoft" onPress={cancel} loading={isLoading} />;
  } else if (hire.status === 'ACTIVE') {
    buttons = (
      <View style={styles.row}>
        <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={cancel} />
        <Button title="Mark completed" icon="checkmark-done" style={{ flex: 2 }} onPress={complete} loading={isLoading} />
      </View>
    );
  } else if (hire.status === 'COMPLETED' && !hire.review) {
    buttons = <Button title="Rate this worker" icon="star" onPress={() => setReviewOpen(true)} />;
  }

  return (
    <>
      {buttons}
      <ReviewSheet hire={hire} visible={reviewOpen && !hire.review} onClose={() => setReviewOpen(false)} />
    </>
  );
}

function ReviewSheet({ hire, visible, onClose }: { hire: Hire; visible: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [review, { isLoading }] = useReviewHireMutation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const submit = async () => {
    try {
      await review({ id: hire.id, workerId: hire.worker.id, rating, comment: comment.trim() || undefined }).unwrap();
      onClose();
      dispatch(toast('success', 'Thanks for your review!', 'It helps other employers hire with confidence.'));
    } catch (err) {
      dispatch(toast('error', "Couldn't post review", errorMessage(err)));
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={`Rate ${hire.worker.fullName.split(' ')[0]}`} subtitle="How was the work?">
      <View style={{ gap: spacing.xl }}>
        <StarInput value={rating} onChange={setRating} />
        <Input label="Comment" optional multiline value={comment} onChangeText={setComment} placeholder="Punctual? Quality of work? Would you hire again?" maxLength={500} />
        <Button title="Post review" onPress={submit} disabled={!rating} loading={isLoading} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
});
