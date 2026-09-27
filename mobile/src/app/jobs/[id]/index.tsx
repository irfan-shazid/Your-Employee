import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppHeader, Avatar, Card, InfoRow, Pill, QueryFallback, Screen, StatusPill, Text } from '@/components/ui';
import { useGetMeQuery } from '@/features/account/api';
import { useGetJobQuery } from '@/features/jobs/api';
import { JobActionBar } from '@/features/jobs/JobActionBar';
import { formatDate, formatStartDate, place, plural, timeAgo, wage, wageTypeLabel } from '@/lib/format';
import { errorMessage } from '@/store/api';
import { radii, spacing, useTheme } from '@/theme';

/** Job details for workers (apply), the owner (manage) and admins (moderate). */
export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data, isError, error, refetch, isFetching } = useGetJobQuery(id);
  const isWorker = useGetMeQuery().data?.user.role === 'WORKER';

  if (!data) return <QueryFallback title="Job" error={isError ? errorMessage(error) : null} onRetry={refetch} />;

  const { job, isOwner, myApplication } = data;
  const canSeeAddress = isOwner || Boolean(myApplication?.hireId);

  return (
    <Screen header={<AppHeader title="Job details" />} footer={<JobActionBar detail={data} />} onRefresh={refetch} refreshing={isFetching}>
      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={styles.pills}>
            <Pill label={job.category.name} tone="primary" icon={job.category.icon as never} />
            {job.isUrgent ? <Pill label="Urgent" tone="accent" icon="flash" /> : null}
            {isOwner || job.status !== 'OPEN' ? <StatusPill status={job.status} /> : null}
            {myApplication ? <StatusPill status={myApplication.status === 'PENDING' ? 'APPLIED' : myApplication.status} /> : null}
          </View>
          <Text variant="title">{job.title}</Text>
          <Text variant="caption" color="textSubtle">
            {job.publishedAt ? `Posted ${timeAgo(job.publishedAt)}` : `Created ${formatDate(job.createdAt)}`} · {plural(job.applicationsCount, 'applicant')}
          </Text>
        </View>

        <View style={[styles.wageBox, { backgroundColor: colors.primarySoft }]}>
          <View>
            <Text variant="caption" color="primary">
              {wageTypeLabel[job.wageType]}
            </Text>
            <Text variant="title" color="primary">
              {wage(job.wageAmount, job.wageType)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" color="primary">
              Workers needed
            </Text>
            <Text variant="title" color="primary">
              {job.hiredCount}/{job.workersNeeded}
            </Text>
          </View>
        </View>

        <Card style={{ gap: spacing.xs }}>
          <InfoRow icon="calendar-outline" label="Starts" value={`${formatStartDate(job.startDate)} · ${plural(job.durationDays, 'day')}`} />
          <InfoRow icon="location-outline" label="Location" value={place(job.area, job.district, job.division)} />
          {job.address && canSeeAddress ? <InfoRow icon="home-outline" label="Address" value={job.address} /> : null}
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Text variant="heading">About the work</Text>
          <Text color="textMuted" style={{ lineHeight: 23 }}>
            {job.description}
          </Text>
        </View>

        <Card style={styles.employer}>
          <Avatar uri={job.employer.avatarUrl} name={job.employer.displayName} size={48} verified={job.employer.verified} />
          <View style={{ flex: 1 }}>
            <Text variant="bodySemibold">{job.employer.displayName}</Text>
            <Text variant="caption" color="textMuted">
              {job.employer.type === 'BUSINESS' ? 'Business' : 'Individual'} · Member since {formatDate(job.employer.memberSince)}
            </Text>
          </View>
          {job.employer.verified ? <Ionicons name="shield-checkmark" size={22} color={colors.primary} /> : null}
        </Card>

        {isWorker && !myApplication ? (
          <View style={[styles.safety, { backgroundColor: colors.infoSoft }]}>
            <Ionicons name="shield-half-outline" size={18} color={colors.info} />
            <Text variant="small" style={{ flex: 1, color: colors.info }}>
              Never pay an employer to get a job. Contact details are shared only after you’re hired.
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  wageBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderRadius: radii.lg },
  employer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  safety: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, alignItems: 'center' },
});
