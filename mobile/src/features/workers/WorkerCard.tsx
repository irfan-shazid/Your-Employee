import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Pill, Rating, Text } from '@/components/ui';
import { availabilityLabel, plural, wage } from '@/lib/format';
import { spacing, useTheme } from '@/theme';
import type { PublicWorker } from '@/types/api';
import { useWorkersPrefetch } from './api';

export const WorkerCard = memo(function WorkerCard({ worker, onPress }: { worker: PublicWorker; onPress?: () => void }) {
  const { colors } = useTheme();
  const prefetch = useWorkersPrefetch('getWorker');
  return (
    <Card
      onPress={onPress ?? (() => router.push(`/workers/${worker.id}`))}
      onPressIn={() => prefetch(worker.id)}
      accessibilityLabel={worker.fullName}
    >
      <View style={styles.row}>
        <Avatar uri={worker.avatarUrl} name={worker.fullName} size={56} verified={worker.verified} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="subheading" numberOfLines={1}>
            {worker.fullName}
          </Text>
          <Text variant="small" color="textMuted" numberOfLines={1}>
            {worker.categories.map((c) => c.name).join(' · ')}
          </Text>
          <View style={styles.inline}>
            <Rating value={worker.ratingAvg} count={worker.ratingCount} size={13} />
            <Text variant="caption" color="textSubtle">
              •
            </Text>
            <Text variant="caption" color="textMuted">
              {plural(worker.experienceYears, 'yr')} exp
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.bottom, { borderTopColor: colors.border }]}>
        <View style={styles.inline}>
          <Ionicons name="location-outline" size={15} color={colors.textSubtle} />
          <Text variant="small" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {worker.area}, {worker.district}
          </Text>
        </View>
        <Text variant="bodySemibold" color="primary">
          {wage(worker.expectedWage, worker.wageType)}
        </Text>
      </View>
      {worker.jobsCompleted > 0 || worker.availability ? (
        <View style={[styles.inline, { marginTop: spacing.sm, gap: spacing.sm }]}>
          <Pill label={availabilityLabel[worker.availability]} tone="info" icon="time-outline" />
          {worker.jobsCompleted > 0 ? <Pill label={`${plural(worker.jobsCompleted, 'job')} done`} tone="success" icon="checkmark-done" /> : null}
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
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
