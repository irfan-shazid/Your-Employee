import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppHeader, Avatar, Card, InfoRow, Pill, QueryFallback, Rating, Screen, StarRow, StatusPill, Text } from '@/components/ui';
import { useGetHireQuery } from '@/features/hires/api';
import { ContactCard } from '@/features/hires/ContactCard';
import { HireActionBar } from '@/features/hires/HireActionBar';
import { formatDate, formatStartDate, place, timeAgo, wage } from '@/lib/format';
import { errorMessage } from '@/store/api';
import { radii, spacing, useTheme } from '@/theme';

/** A hire (or job offer) as seen by the employer, the worker or an admin. */
export default function HireDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data, isError, error, refetch, isFetching } = useGetHireQuery(id);

  if (!data) return <QueryFallback title="Hire" error={isError ? errorMessage(error) : null} onRetry={refetch} />;

  const { hire, viewer, fee } = data;
  const isEmployer = viewer === 'EMPLOYER';
  const other = isEmployer
    ? { name: hire.worker.fullName, avatar: hire.worker.avatarUrl, verified: hire.worker.verified, sub: hire.worker.categories.map((c) => c.name).join(' · ') }
    : { name: hire.employer.displayName, avatar: hire.employer.avatarUrl, verified: hire.employer.verified, sub: hire.employer.type === 'BUSINESS' ? 'Business' : 'Individual' };

  return (
    <Screen
      header={<AppHeader title={isEmployer ? 'Hire details' : 'Job offer'} />}
      footer={<HireActionBar hire={hire} viewer={viewer} fee={fee} />}
      onRefresh={refetch}
      refreshing={isFetching}
    >
      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <View style={styles.pills}>
            <StatusPill status={hire.status} size="md" />
            <Pill label={hire.source === 'DIRECT' ? 'Direct hire' : 'From job post'} tone="neutral" />
            {hire.paidWithCredit ? <Pill label="Paid with credit" tone="info" icon="gift-outline" /> : null}
          </View>
          <Text variant="title">{hire.title}</Text>
          <Text variant="caption" color="textSubtle">
            Created {timeAgo(hire.createdAt)}
          </Text>
        </View>

        <Card onPress={isEmployer ? () => router.push(`/workers/${hire.worker.id}`) : undefined} style={styles.person}>
          <Avatar uri={other.avatar} name={other.name} size={52} verified={other.verified} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="subheading">{other.name}</Text>
            <Text variant="small" color="textMuted" numberOfLines={1}>
              {other.sub}
            </Text>
            {isEmployer ? <Rating value={hire.worker.ratingAvg} count={hire.worker.ratingCount} /> : null}
          </View>
          {isEmployer ? <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} /> : null}
        </Card>

        <ContactCard hire={hire} isEmployer={isEmployer} />

        <View style={[styles.wageBox, { backgroundColor: colors.primarySoft }]}>
          <Text variant="caption" color="primary">
            Agreed pay
          </Text>
          <Text variant="title" color="primary">
            {wage(hire.wageAmount, hire.wageType)}
          </Text>
        </View>

        <Card style={{ gap: spacing.xs }}>
          <InfoRow icon="grid-outline" label="Category" value={hire.category.name} />
          <InfoRow icon="calendar-outline" label="Start date" value={formatStartDate(hire.startDate)} />
          <InfoRow icon="location-outline" label="Location" value={place(hire.area, hire.district)} />
          {hire.completedAt ? <InfoRow icon="checkmark-done-outline" label="Completed" value={formatDate(hire.completedAt)} /> : null}
        </Card>

        {hire.description ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="heading">Details</Text>
            <Text color="textMuted" style={{ lineHeight: 23 }}>
              {hire.description}
            </Text>
          </View>
        ) : null}

        {hire.review ? (
          <Card style={{ gap: spacing.sm }}>
            <Text variant="overline" color="textMuted">
              {isEmployer ? 'Your review' : 'Employer’s review'}
            </Text>
            <StarRow value={hire.review.rating} size={20} />
            {hire.review.comment ? <Text>“{hire.review.comment}”</Text> : null}
          </Card>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wageBox: { padding: spacing.lg, borderRadius: radii.lg },
});
