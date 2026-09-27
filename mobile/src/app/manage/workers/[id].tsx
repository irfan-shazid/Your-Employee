import { useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { DecisionBar } from '@/features/admin/DecisionBar';
import { PrivateImage } from '@/features/admin/PrivateImage';
import { AppHeader, Avatar, Button, Card, InfoRow, Pill, QueryFallback, Screen, StatusPill, Text } from '@/components/ui';
import { availabilityLabel, capitalize, formatDate, timeAgo, wage, place } from '@/lib/format';
import { errorMessage } from '@/store/api';
import { useGetAdminWorkerQuery } from '@/features/admin/api';
import { radii, spacing, useTheme } from '@/theme';

export default function ReviewWorker() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data, isError, error, refetch, isFetching } = useGetAdminWorkerQuery(id);

  if (!data) return <QueryFallback title="Review worker" error={isError ? errorMessage(error) : null} onRetry={refetch} />;
  const w = data.worker;

  return (
    <Screen
      header={<AppHeader title="Review worker" />}
      footer={<DecisionBar kind="workers" id={w.id} status={w.status} name={w.fullName} />}
      onRefresh={refetch}
      refreshing={isFetching}
    >
      <View style={{ gap: spacing.lg }}>
        <View style={styles.top}>
          <Avatar uri={w.avatarUrl} name={w.fullName} size={80} />
          <Text variant="title" align="center">
            {w.fullName}
          </Text>
          <Text variant="small" color="textMuted">
            {w.email} · submitted {timeAgo(w.submittedAt)}
          </Text>
          <StatusPill status={w.status} size="md" />
        </View>

        {w.rejectionReason ? (
          <View style={[styles.reason, { backgroundColor: colors.dangerSoft }]}>
            <Text variant="caption" color="danger">
              Last note: {w.rejectionReason}
            </Text>
          </View>
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <Text variant="overline" color="textMuted">
            Identity check
          </Text>
          <InfoRow icon="id-card-outline" label="NID number" value={w.nidNumber} />
          <InfoRow icon="calendar-outline" label="Date of birth" value={w.dateOfBirth ? `${formatDate(w.dateOfBirth)} (${w.age} yrs)` : '—'} />
          <InfoRow icon="person-outline" label="Gender" value={capitalize(w.gender.toLowerCase())} />
          <InfoRow
            icon="call-outline"
            label="Mobile"
            value={w.phone}
            right={<Button title="Call" size="sm" variant="soft" fullWidth={false} onPress={() => Linking.openURL(`tel:${w.phone}`)} />}
          />
          {w.nidImageId ? (
            <PrivateImage mediaId={w.nidImageId} style={styles.nid} />
          ) : (
            <View style={[styles.noNid, { backgroundColor: colors.warningSoft }]}>
              <Text variant="small" color="warning">
                No NID photo uploaded
              </Text>
            </View>
          )}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text variant="overline" color="textMuted">
            Work profile
          </Text>
          <View style={styles.pills}>
            {w.categories.map((c) => (
              <Pill key={c.id} label={c.name} tone="primary" icon={c.icon as never} />
            ))}
          </View>
          {w.skills.length ? (
            <Text variant="small" color="textMuted">
              Skills: {w.skills.map(capitalize).join(', ')}
            </Text>
          ) : null}
          <InfoRow icon="cash-outline" label="Expected wage" value={wage(w.expectedWage, w.wageType)} />
          <InfoRow icon="time-outline" label="Availability" value={availabilityLabel[w.availability]} />
          <InfoRow icon="ribbon-outline" label="Experience" value={`${w.experienceYears} years`} />
          <InfoRow icon="location-outline" label="Location" value={place(w.area, w.district, w.division)} />
          {w.address ? <InfoRow icon="home-outline" label="Address" value={w.address} /> : null}
          {w.bio ? <Text color="textMuted">“{w.bio}”</Text> : null}
        </Card>

        <Card style={{ gap: spacing.xs }}>
          <Text variant="overline" color="textMuted">
            Activity
          </Text>
          <InfoRow icon="card-outline" label="Subscription" value={w.subscriptionActive ? `Active until ${formatDate(w.subscriptionExpiresAt)}` : 'Inactive'} />
          <InfoRow icon="briefcase-outline" label="Hires / reviews" value={`${data.counts.hires} / ${data.counts.reviews}`} />
          <InfoRow icon="star-outline" label="Rating" value={w.ratingCount ? `${w.ratingAvg.toFixed(1)} (${w.ratingCount})` : 'No reviews'} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: spacing.xs },
  reason: { padding: spacing.md, borderRadius: radii.md },
  nid: { width: '100%', height: 200, borderRadius: radii.md },
  noNid: { padding: spacing.md, borderRadius: radii.md, alignItems: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
