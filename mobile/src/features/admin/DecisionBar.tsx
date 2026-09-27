import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Input, Sheet, Text } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/store/api';
import { useDecideProfileMutation, type Decision } from '@/features/admin/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import { spacing } from '@/theme';
import type { ApprovalStatus } from '@/types/api';

const quickReasons = {
  reject: ['Photo is not clear', 'NID number does not match the name', 'Please add your NID photo', 'Incomplete information'],
  suspend: ['Reported by multiple users', 'Fake or misleading profile', 'Asked for money outside the app'],
};

/** Approve / reject / suspend / reinstate buttons with a reason sheet. */
export function DecisionBar({ kind, id, status, name }: { kind: 'workers' | 'employers'; id: string; status: ApprovalStatus; name: string }) {
  const dispatch = useAppDispatch();
  const [decide, { isLoading }] = useDecideProfileMutation();
  const [reasonFor, setReasonFor] = useState<'reject' | 'suspend' | null>(null);
  const [reason, setReason] = useState('');

  const run = async (action: Decision, why?: string) => {
    try {
      await decide({ kind, id, action, reason: why }).unwrap();
      setReasonFor(null);
      setReason('');
      const msg = { approve: `${name} approved`, reinstate: `${name} reinstated`, reject: 'Sent back for changes', suspend: `${name} suspended` }[action];
      dispatch(toast('success', msg, action === 'approve' ? 'They have been notified.' : undefined));
    } catch (err) {
      dispatch(toast('error', 'Action failed', errorMessage(err)));
    }
  };

  const approve = async () => {
    if (await confirm({ title: `Approve ${name}?`, message: 'They will be able to use the app right away.', confirmText: 'Approve' })) run('approve');
  };

  return (
    <>
      {status === 'PENDING' || status === 'REJECTED' ? (
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button title="Reject" variant="dangerSoft" style={{ flex: 1 }} onPress={() => setReasonFor('reject')} />
          <Button title="Approve" icon="checkmark" style={{ flex: 2 }} onPress={approve} loading={isLoading && !reasonFor} />
        </View>
      ) : status === 'APPROVED' ? (
        <Button title="Suspend account" icon="ban" variant="dangerSoft" onPress={() => setReasonFor('suspend')} />
      ) : (
        <Button title="Reinstate account" icon="refresh" onPress={() => run('reinstate')} loading={isLoading} />
      )}

      <Sheet
        visible={Boolean(reasonFor)}
        onClose={() => setReasonFor(null)}
        title={reasonFor === 'reject' ? 'What needs to change?' : 'Reason for suspension'}
        subtitle={`${name} will see this message.`}
      >
        <View style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(reasonFor ? quickReasons[reasonFor] : []).map((r) => (
              <Chip key={r} label={r} size="sm" selected={reason === r} onPress={() => setReason(r)} />
            ))}
          </View>
          <Input label="Message" multiline value={reason} onChangeText={setReason} placeholder="Explain clearly so they can fix it" maxLength={300} />
          <Text variant="caption" color="textMuted">
            {reasonFor === 'suspend' ? 'Suspended employers have their open jobs closed.' : 'They can edit their profile and resubmit.'}
          </Text>
          <Button
            title={reasonFor === 'reject' ? 'Send back for changes' : 'Suspend'}
            variant="danger"
            disabled={reason.trim().length < 3}
            loading={isLoading}
            onPress={() => reasonFor && run(reasonFor, reason.trim())}
          />
        </View>
      </Sheet>
    </>
  );
}
