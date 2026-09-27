import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Pill, StatusPill, Text } from '@/components/ui';
import { formatStartDate, plural, timeAgo, wage } from '@/lib/format';
import { radii, spacing, useTheme } from '@/theme';
import type { Job, JobListItem } from '@/types/api';
import { useJobsPrefetch } from './api';

type Props = { job: Job | JobListItem; showStatus?: boolean; onPress?: () => void };

export const JobCard = memo(function JobCard({ job, showStatus, onPress }: Props) {
  const { colors } = useTheme();
  const prefetch = useJobsPrefetch('getJob');
  const applied = 'myApplication' in job ? job.myApplication : null;

  return (
    <Card
      onPress={onPress ?? (() => router.push(`/jobs/${job.id}`))}
      onPressIn={() => prefetch(job.id)}
      accessibilityLabel={`${job.title}, ${wage(job.wageAmount, job.wageType)}`}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={job.category.icon as never} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subheading" numberOfLines={2}>
            {job.title}
          </Text>
          <View style={styles.employer}>
            <Text variant="small" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
              {job.employer.displayName}
            </Text>
            {job.employer.verified ? <Ionicons name="checkmark-circle" size={14} color={colors.primary} /> : null}
          </View>
        </View>
        {job.isUrgent && !showStatus ? <Pill label="Urgent" tone="accent" icon="flash" /> : null}
        {showStatus ? <StatusPill status={job.status} /> : null}
      </View>

      <View style={styles.meta}>
        <Meta icon="location-outline" text={`${job.area}, ${job.district}`} />
        <Meta icon="calendar-outline" text={`${formatStartDate(job.startDate)} · ${plural(job.durationDays, 'day')}`} />
      </View>

      <View style={[styles.bottom, { borderTopColor: colors.border }]}>
        <Text variant="heading" color="primary">
          {wage(job.wageAmount, job.wageType)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {applied ? (
            <StatusPill status={applied.status === 'PENDING' ? 'APPLIED' : applied.status} />
          ) : showStatus ? (
            <Text variant="caption" color="textMuted">
              {plural(job.applicationsCount, 'applicant')}
            </Text>
          ) : (
            <Text variant="caption" color="textSubtle">
              {job.publishedAt ? timeAgo(job.publishedAt) : ''}
              {job.workersNeeded > 1 ? ` · ${job.workersNeeded} needed` : ''}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
});

function Meta({ icon, text }: { icon: 'location-outline' | 'calendar-outline'; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={15} color={colors.textSubtle} />
      <Text variant="small" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { width: 46, height: 46, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  employer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { gap: 6, marginTop: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
