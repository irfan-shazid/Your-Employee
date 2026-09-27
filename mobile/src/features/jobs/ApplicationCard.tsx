import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, StatusPill, Text } from '@/components/ui';
import { formatStartDate, timeAgo, wage } from '@/lib/format';
import { spacing } from '@/theme';
import type { MyApplication } from '@/types/api';
import { useJobsPrefetch } from './api';

/** One of the worker's own applications. */
export const ApplicationCard = memo(function ApplicationCard({ application: a }: { application: MyApplication }) {
  const prefetch = useJobsPrefetch('getJob');
  return (
    <Card onPress={() => router.push(`/jobs/${a.job.id}`)} onPressIn={() => prefetch(a.job.id)} style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        <Text variant="subheading" style={{ flex: 1 }} numberOfLines={2}>
          {a.job.title}
        </Text>
        <StatusPill status={a.status === 'PENDING' ? 'APPLIED' : a.status} />
      </View>
      <Text variant="small" color="textMuted">
        {a.job.employer.displayName} · {a.job.area}, {a.job.district}
      </Text>
      <View style={styles.row}>
        <Text variant="bodySemibold" color="primary">
          {wage(a.job.wageAmount, a.job.wageType)}
        </Text>
        <Text variant="caption" color="textSubtle">
          Starts {formatStartDate(a.job.startDate)} · applied {timeAgo(a.createdAt)}
        </Text>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
