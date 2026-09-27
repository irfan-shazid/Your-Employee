import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AccountSection } from '@/features/account/AccountSection';
import { ProfileHero } from '@/components/layout/ProfileHero';
import { Button, Card, IconButton, InfoRow, Pill, Text } from '@/components/ui';
import { availabilityLabel, capitalize, daysUntil, formatDate, taka, wage } from '@/lib/format';
import { useGetMeQuery, useSetAvailabilityMutation } from '@/features/account/api';
import { radii, spacing, useTheme } from '@/theme';

export default function WorkerProfile() {
  const { colors } = useTheme();
  const { data: me, refetch, isFetching } = useGetMeQuery();
  const [setAvailability] = useSetAvailabilityMutation();
  const w = me?.worker;
  if (!w || !me) return null;

  const days = daysUntil(w.subscriptionExpiresAt);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: spacing.huge }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#fff" colors={[colors.primary]} />}
    >
      <ProfileHero
        name={w.fullName}
        avatar={w.avatarUrl}
        verified={w.verified}
        subtitle={w.categories.map((c) => c.name).join(' · ')}
        right={<IconButton icon="create-outline" variant="glass" accessibilityLabel="Edit profile" onPress={() => router.push('/edit-profile')} />}
        stats={[
          { label: 'Rating', value: w.ratingCount ? `★ ${w.ratingAvg.toFixed(1)}` : 'New' },
          { label: 'Jobs done', value: String(w.jobsCompleted) },
          { label: 'Experience', value: `${w.experienceYears} yr` },
        ]}
      />

      <View style={styles.body}>
        <Card style={styles.rowCard}>
          <View style={[styles.dot, { backgroundColor: w.isAvailable ? colors.success : colors.textSubtle }]} />
          <View style={{ flex: 1 }}>
            <Text variant="bodySemibold">{w.isAvailable ? 'Available for work' : 'Not taking work'}</Text>
            <Text variant="caption" color="textMuted">
              {w.isAvailable ? 'Employers can find and hire you' : "You're hidden from employer searches"}
            </Text>
          </View>
          <Switch
            value={w.isAvailable}
            onValueChange={(v) => {
              setAvailability(v);
            }}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
            accessibilityLabel="Available for work"
          />
        </Card>

        <Card style={[styles.plan, { borderColor: w.subscriptionActive ? colors.primary : colors.accent }]}>
          <View style={styles.planTop}>
            <View style={[styles.planIcon, { backgroundColor: w.subscriptionActive ? colors.primarySoft : colors.accentSoft }]}>
              <Ionicons name={w.subscriptionActive ? 'shield-checkmark' : 'flash'} size={22} color={w.subscriptionActive ? colors.primary : colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subheading">Worker plan</Text>
              <Text variant="small" color="textMuted">
                {w.subscriptionActive
                  ? `Active until ${formatDate(w.subscriptionExpiresAt)} · ${days} day${days === 1 ? '' : 's'} left`
                  : 'Inactive — you cannot apply or appear in searches'}
              </Text>
            </View>
            <Pill label={w.subscriptionActive ? 'Active' : 'Inactive'} tone={w.subscriptionActive ? 'success' : 'accent'} />
          </View>
          {!w.subscriptionActive || days <= 5 ? (
            <Button
              title={w.subscriptionActive ? `Extend for ${taka(me.pricing.workerMonthly)}` : `Activate for ${taka(me.pricing.workerMonthly)}/month`}
              size="md"
              variant={w.subscriptionActive ? 'soft' : 'primary'}
              onPress={() => router.push('/subscription')}
            />
          ) : null}
        </Card>

        <Card style={{ gap: spacing.xs }}>
          <Text variant="overline" color="textMuted" style={{ marginBottom: spacing.xs }}>
            Work details
          </Text>
          <InfoRow icon="cash-outline" label="Expected wage" value={wage(w.expectedWage, w.wageType)} />
          <InfoRow icon="time-outline" label="Availability" value={availabilityLabel[w.availability]} />
          <InfoRow icon="location-outline" label="Location" value={`${w.area}, ${w.district}`} />
          <InfoRow icon="call-outline" label="Mobile" value={w.phone} />
          {w.skills.length ? (
            <View style={styles.skills}>
              {w.skills.map((s) => (
                <Pill key={s} label={capitalize(s)} tone="primary" />
              ))}
            </View>
          ) : null}
        </Card>

        <AccountSection />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.lg },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  plan: { gap: spacing.md, borderWidth: 1.5 },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  planIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
});
