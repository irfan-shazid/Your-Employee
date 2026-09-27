import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, StatusPill, Text } from '@/components/ui';
import { formatStartDate, wage } from '@/lib/format';
import { spacing, useTheme } from '@/theme';
import type { Hire } from '@/types/api';
import { useHiresPrefetch } from './api';

/** A hire seen from either side: the employer sees the worker, the worker sees the employer. */
export const HireCard = memo(function HireCard({ hire, viewer }: { hire: Hire; viewer: 'EMPLOYER' | 'WORKER' }) {
  const { colors } = useTheme();
  const prefetch = useHiresPrefetch('getHire');
  const other =
    viewer === 'EMPLOYER'
      ? { name: hire.worker.fullName, avatar: hire.worker.avatarUrl, verified: hire.worker.verified }
      : { name: hire.employer.displayName, avatar: hire.employer.avatarUrl, verified: hire.employer.verified };
  const needsAction = (viewer === 'WORKER' && hire.status === 'OFFERED') || (viewer === 'EMPLOYER' && hire.status === 'PENDING_PAYMENT');

  return (
    <Card onPress={() => router.push(`/hires/${hire.id}`)} onPressIn={() => prefetch(hire.id)} style={needsAction ? { borderColor: colors.primary, borderWidth: 1.5 } : undefined}>
      <View style={styles.row}>
        <Avatar uri={other.avatar} name={other.name} size={46} verified={other.verified} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subheading" numberOfLines={1}>
            {hire.title}
          </Text>
          <Text variant="small" color="textMuted" numberOfLines={1}>
            {other.name}
          </Text>
        </View>
        <StatusPill status={hire.status} />
      </View>
      <View style={[styles.bottom, { borderTopColor: colors.border }]}>
        <View style={styles.inline}>
          <Ionicons name="calendar-outline" size={15} color={colors.textSubtle} />
          <Text variant="small" color="textMuted">
            {formatStartDate(hire.startDate)}
          </Text>
        </View>
        <Text variant="bodySemibold" color="primary">
          {wage(hire.wageAmount, hire.wageType)}
        </Text>
      </View>
      {needsAction ? (
        <View style={[styles.action, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="hand-left-outline" size={16} color={colors.primary} />
          <Text variant="smallBold" color="primary">
            {viewer === 'WORKER' ? 'New offer — tap to accept or decline' : 'Complete payment to confirm this hire'}
          </Text>
        </View>
      ) : null}
    </Card>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, padding: spacing.sm, borderRadius: 10 },
});
