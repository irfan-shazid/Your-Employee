import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppHeader, Avatar, Button, Card, EmptyState, InfoRow, Pill, QueryFallback, Rating, Screen, SectionTitle, StarRow, StatusPill, Text } from '@/components/ui';
import { availabilityLabel, capitalize, formatDate, plural, timeAgo, wage } from '@/lib/format';
import { errorMessage } from '@/store/api';
import { useGetWorkerQuery } from '@/features/workers/api';
import { radii, spacing, useTheme } from '@/theme';

export default function WorkerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data, isError, error, refetch, isFetching } = useGetWorkerQuery(id);

  if (!data) return <QueryFallback title="Worker" error={isError ? errorMessage(error) : null} onRetry={refetch} />;

  const { worker: w, contact, reviews, hires } = data;
  const activeHire = hires.find((h) => h.status === 'OFFERED' || h.status === 'ACTIVE' || h.status === 'PENDING_PAYMENT');
  const canHire = data.subscriptionActive && w.isAvailable;

  return (
    <Screen
      header={<AppHeader title="Worker profile" />}
      onRefresh={refetch}
      refreshing={isFetching}
      footer={
        activeHire ? (
          <Button title={`View ${activeHire.status === 'PENDING_PAYMENT' ? 'unpaid hire' : 'current hire'}`} icon="ribbon-outline" variant="soft" onPress={() => router.push(`/hires/${activeHire.id}`)} />
        ) : canHire ? (
          <Button title={`Hire ${w.fullName.split(' ')[0]}`} icon="flash" onPress={() => router.push({ pathname: '/hires/new', params: { workerId: w.id } })} />
        ) : (
          <Button title="Not available right now" disabled />
        )
      }
    >
      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: spacing.lg }}>
        <View style={styles.top}>
          <Avatar uri={w.avatarUrl} name={w.fullName} size={88} verified={w.verified} />
          <Text variant="title" align="center">
            {w.fullName}
          </Text>
          <View style={styles.inline}>
            <Rating value={w.ratingAvg} count={w.ratingCount} size={16} />
            <Text color="textSubtle">•</Text>
            <Text variant="small" color="textMuted">
              {w.area}, {w.district}
            </Text>
          </View>
          <View style={[styles.inline, { flexWrap: 'wrap', justifyContent: 'center' }]}>
            {w.verified ? <Pill label="ID verified" tone="success" icon="shield-checkmark" /> : null}
            <Pill label={w.isAvailable ? 'Available' : 'Busy'} tone={w.isAvailable ? 'primary' : 'neutral'} icon={w.isAvailable ? 'radio-button-on' : 'pause'} />
          </View>
        </View>

        <View style={[styles.stats, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { label: 'Experience', value: plural(w.experienceYears, 'yr') },
            { label: 'Jobs done', value: String(w.jobsCompleted) },
            { label: 'Expects', value: wage(w.expectedWage, w.wageType) },
          ].map((s, i) => (
            <View key={s.label} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
              <Text variant="bodySemibold" align="center" numberOfLines={1}>
                {s.value}
              </Text>
              <Text variant="caption" color="textMuted">
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {contact ? (
          <Card style={[styles.contact, { borderColor: colors.primary }]}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="primary">
                Phone (unlocked)
              </Text>
              <Text variant="heading">{contact.phone}</Text>
            </View>
            <Button title="Call" icon="call" size="sm" fullWidth={false} onPress={() => Linking.openURL(`tel:${contact.phone}`)} />
          </Card>
        ) : (
          <View style={[styles.locked, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
            <Text variant="small" color="textMuted" style={{ flex: 1 }}>
              Phone number is shared after you hire this worker.
            </Text>
          </View>
        )}

        <Card style={{ gap: spacing.md }}>
          <Text variant="overline" color="textMuted">
            Work
          </Text>
          <View style={styles.pills}>
            {w.categories.map((c) => (
              <Pill key={c.id} label={c.name} tone="primary" icon={c.icon as never} size="md" />
            ))}
          </View>
          {w.skills.length ? (
            <View style={styles.pills}>
              {w.skills.map((s) => (
                <Pill key={s} label={capitalize(s)} tone="neutral" />
              ))}
            </View>
          ) : null}
          <InfoRow icon="time-outline" label="Availability" value={availabilityLabel[w.availability]} />
          {w.age ? <InfoRow icon="person-outline" label="Age" value={`${w.age} years`} /> : null}
          <InfoRow icon="calendar-outline" label="Member since" value={formatDate(w.memberSince)} />
        </Card>

        {w.bio ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="heading">About</Text>
            <Text color="textMuted" style={{ lineHeight: 23 }}>
              {w.bio}
            </Text>
          </View>
        ) : null}

        {hires.length ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="heading">Your history with {w.fullName.split(' ')[0]}</Text>
            {hires.map((h) => (
              <Card key={h.id} onPress={() => router.push(`/hires/${h.id}`)} style={styles.inlineCard}>
                <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
                  {h.title}
                </Text>
                <StatusPill status={h.status} />
              </Card>
            ))}
          </View>
        ) : null}

        <View>
          <SectionTitle title={`Reviews${reviews.length ? ` (${w.ratingCount})` : ''}`} />
          {reviews.length ? (
            <View style={{ gap: spacing.md }}>
              {reviews.map((r) => (
                <Card key={r.id} style={{ gap: spacing.sm }}>
                  <View style={styles.reviewTop}>
                    <Avatar uri={r.employer.avatarUrl} name={r.employer.displayName} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySemibold" numberOfLines={1}>
                        {r.employer.displayName}
                      </Text>
                      <Text variant="caption" color="textMuted" numberOfLines={1}>
                        {r.jobTitle} · {timeAgo(r.createdAt)}
                      </Text>
                    </View>
                    <StarRow value={r.rating} size={14} />
                  </View>
                  {r.comment ? <Text color="textMuted">“{r.comment}”</Text> : null}
                </Card>
              ))}
            </View>
          ) : (
            <Card>
              <EmptyState icon="star-outline" title="No reviews yet" message="Be the first to hire and review this worker." />
            </Card>
          )}
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stats: { flexDirection: 'row', borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5 },
  locked: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  inlineCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
