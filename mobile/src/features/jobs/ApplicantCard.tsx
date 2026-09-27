import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Rating, ScalePressable, StatusPill, Text } from '@/components/ui';
import { usePayment } from '@/features/payments/usePayment';
import { plural, timeAgo, wage } from '@/lib/format';
import { errorMessage } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import { radii, spacing, useTheme } from '@/theme';
import type { Applicant } from '@/types/api';
import { useDecideApplicantMutation } from './api';

type Props = { applicant: Applicant; jobId: string; jobOpen: boolean; onHire: (applicant: Applicant) => void };

/** One applicant on the employer's applicants screen, with shortlist / reject / hire actions. */
export const ApplicantCard = memo(function ApplicantCard({ applicant: a, jobId, jobOpen, onHire }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [decide] = useDecideApplicantMutation();
  const { pay, paying } = usePayment();
  const w = a.worker;
  const canDecide = a.status === 'PENDING' || a.status === 'SHORTLISTED';

  const decideAs = (action: 'shortlist' | 'reject') =>
    decide({ id: a.id, jobId, action })
      .unwrap()
      .then(() => dispatch(toast('success', action === 'shortlist' ? 'Shortlisted' : 'Applicant rejected')))
      .catch((err) => dispatch(toast('error', 'Something went wrong', errorMessage(err))));

  return (
    <Card style={{ gap: spacing.md }}>
      <ScalePressable onPress={() => router.push(`/workers/${w.id}`)} scaleTo={0.98} style={styles.person} accessibilityLabel={`View ${w.fullName}`}>
        <Avatar uri={w.avatarUrl} name={w.fullName} size={52} verified={w.verified} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subheading" numberOfLines={1}>
            {w.fullName}
          </Text>
          <Rating value={w.ratingAvg} count={w.ratingCount} />
          <Text variant="caption" color="textMuted">
            {plural(w.experienceYears, 'yr')} exp · {plural(w.jobsCompleted, 'job')} done · asks {wage(w.expectedWage, w.wageType)}
          </Text>
        </View>
        <StatusPill status={a.status} />
      </ScalePressable>

      {a.message ? (
        <View style={[styles.message, { backgroundColor: colors.surfaceAlt }]}>
          <Text variant="small">“{a.message}”</Text>
        </View>
      ) : null}
      <Text variant="caption" color="textSubtle">
        Applied {timeAgo(a.createdAt)}
      </Text>

      {a.hire?.status === 'PENDING_PAYMENT' ? (
        <Button title="Complete hiring payment" icon="card-outline" size="md" onPress={() => pay('HIRE', a.hire!.id)} loading={paying} />
      ) : a.hire ? (
        <Button title="View hire" icon="ribbon-outline" size="md" variant="soft" onPress={() => router.push(`/hires/${a.hire!.id}`)} />
      ) : canDecide ? (
        <View style={styles.actions}>
          <Button title="Reject" size="sm" variant="outline" style={{ flex: 1 }} onPress={() => decideAs('reject')} />
          {a.status === 'PENDING' ? <Button title="Shortlist" size="sm" variant="soft" style={{ flex: 1 }} onPress={() => decideAs('shortlist')} /> : null}
          <Button title="Hire" size="sm" icon="checkmark" style={{ flex: 1 }} onPress={() => onHire(a)} disabled={!jobOpen} />
        </View>
      ) : null}
    </Card>
  );
});

const styles = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  message: { padding: spacing.md, borderRadius: radii.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
