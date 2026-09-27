/** List rows for the admin screens. */
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Pill, StatusPill, Text } from '@/components/ui';
import { formatDate, money, paymentMethodLabel, purposeLabel, timeAgo } from '@/lib/format';
import { spacing } from '@/theme';
import type { AdminEmployer, AdminPayment, AdminUser, AdminWorker, ApprovalStatus } from '@/types/api';

export type QueueItem = {
  id: string;
  kind: 'workers' | 'employers';
  name: string;
  avatar: string | null;
  summary: string;
  submittedAt: string;
  status: ApprovalStatus;
  note?: string;
};

export const toQueueItem = {
  worker: (w: AdminWorker): QueueItem => ({
    id: w.id,
    kind: 'workers',
    name: w.fullName,
    avatar: w.avatarUrl,
    summary: `${w.categories.map((c) => c.name).join(', ')} · ${w.district}`,
    submittedAt: w.submittedAt,
    status: w.status,
    note: w.nidImageId ? 'NID photo ✓' : undefined,
  }),
  employer: (e: AdminEmployer): QueueItem => ({
    id: e.id,
    kind: 'employers',
    name: e.displayName,
    avatar: e.avatarUrl,
    summary: `${e.type === 'BUSINESS' ? 'Business' : 'Individual'} · ${e.district}`,
    submittedAt: e.submittedAt,
    status: e.status,
  }),
};

export const QueueRow = memo(function QueueRow({ item }: { item: QueueItem }) {
  return (
    <Card onPress={() => router.push(`/manage/${item.kind}/${item.id}`)} style={styles.row}>
      <Avatar uri={item.avatar} name={item.name} size={46} />
      <View style={styles.body}>
        <Text variant="bodySemibold" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {item.summary}
        </Text>
        <Text variant="caption" color="textSubtle">
          Submitted {timeAgo(item.submittedAt)}
          {item.note ? ` · ${item.note}` : ''}
        </Text>
      </View>
      <StatusPill status={item.status} />
    </Card>
  );
});

export const AdminPaymentRow = memo(function AdminPaymentRow({ payment: p }: { payment: AdminPayment }) {
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={[styles.row, { alignItems: 'flex-start' }]}>
        <View style={styles.body}>
          <Text variant="bodySemibold" numberOfLines={1}>
            {p.user.name}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {p.user.email}
          </Text>
        </View>
        <View style={styles.end}>
          <Text variant="subheading">{money(p.amount, p.currency)}</Text>
          <StatusPill status={p.status} />
        </View>
      </View>
      <Text variant="caption" color="textMuted">
        {purposeLabel[p.purpose]} · {p.paidAt ? formatDate(p.paidAt) : timeAgo(p.createdAt)} · {paymentMethodLabel(p)}
      </Text>
      <Text variant="caption" color="textSubtle" selectable>
        {p.tranId}
        {p.bankTranId ? ` · ${p.provider === 'STRIPE' ? 'charge' : 'bank'} ${p.bankTranId}` : ''}
      </Text>
      {p.failureReason && p.status !== 'SUCCESS' ? (
        <Text variant="caption" color="danger">
          {p.failureReason}
        </Text>
      ) : null}
    </Card>
  );
});

export const UserRow = memo(function UserRow({ user }: { user: AdminUser }) {
  const profile = user.workerProfile ?? user.employerProfile;
  const href = user.workerProfile
    ? (`/manage/workers/${user.workerProfile.id}` as const)
    : user.employerProfile
      ? (`/manage/employers/${user.employerProfile.id}` as const)
      : null;
  const role = user.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'No role';

  return (
    <Card onPress={href ? () => router.push(href) : undefined} style={styles.row}>
      <Avatar uri={user.image} name={user.name} size={44} />
      <View style={styles.body}>
        <Text variant="bodySemibold" numberOfLines={1}>
          {user.name}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {user.email}
        </Text>
        <Text variant="caption" color="textSubtle">
          Joined {timeAgo(user.createdAt)}
        </Text>
      </View>
      <View style={styles.end}>
        <Pill label={role} tone={user.role === 'ADMIN' ? 'accent' : user.role ? 'primary' : 'neutral'} />
        {profile ? <StatusPill status={profile.status} /> : null}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 2 },
  end: { alignItems: 'flex-end', gap: 4 },
});
