import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RevenueChart } from '@/features/admin/RevenueChart';
import { StatTile } from '@/features/admin/StatTile';
import { Card, ErrorState, Segmented, Skeleton, Text } from '@/components/ui';
import { currencySymbol, money, plural, purposeLabel } from '@/lib/format';
import { errorMessage } from '@/store/api';
import { useGetAdminStatsQuery } from '@/features/admin/api';
import { fonts, radii, spacing, useTheme } from '@/theme';

export default function AdminOverview() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: s, isLoading, isError, error, refetch, isFetching } = useGetAdminStatsQuery();

  // Revenue is reported per currency (BDT via SSLCommerz, e.g. USD via Stripe) and never mixed.
  const [picked, setPicked] = useState('BDT');
  const currencies = s?.revenue.currencies ?? [];
  const r = currencies.find((c) => c.currency === picked) ?? currencies[0];
  const currency = r?.currency ?? 'BDT';

  const pendingWorkers = s?.workers.PENDING ?? 0;
  const pendingEmployers = s?.employers.PENDING ?? 0;
  const purposes = (['WORKER_SUBSCRIPTION', 'JOB_POST', 'HIRE'] as const).map((p) => ({ key: p, ...(r?.byPurpose[p] ?? { amount: 0, count: 0 }) }));
  const purposeMax = Math.max(1, ...purposes.map((p) => p.amount));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.huge, gap: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text variant="overline" color="textMuted">
          Admin dashboard
        </Text>
        <Text variant="title">Overview</Text>
      </View>

      {isError ? <ErrorState message={errorMessage(error)} onRetry={refetch} /> : null}

      {currencies.length > 1 ? (
        <Segmented
          options={currencies.map((c) => ({ value: c.currency, label: `${currencySymbol(c.currency).trim()} ${c.currency}` }))}
          value={currency}
          onChange={setPicked}
        />
      ) : null}

      {/* Hero figure: the one number this dashboard leads with */}
      <Animated.View entering={FadeInDown.duration(300)}>
        <Card style={{ gap: 4 }}>
          <Text variant="smallMedium" color="textMuted">
            Revenue this month
          </Text>
          {isLoading ? (
            <Skeleton width={180} height={48} />
          ) : (
            <Text style={[styles.hero, { color: colors.text }]}>{money(r?.thisMonth ?? 0, currency)}</Text>
          )}
          <Text variant="small" color="textMuted">
            {money(r?.total ?? 0, currency)} all time · {plural(r?.payments ?? 0, 'payment')}
          </Text>
        </Card>
      </Animated.View>

      {pendingWorkers + pendingEmployers > 0 ? (
        <Card onPress={() => router.navigate('/admin/approvals')} style={[styles.pending, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
          <Text variant="bodySemibold" style={{ flex: 1 }}>
            {pendingWorkers + pendingEmployers} profile{pendingWorkers + pendingEmployers > 1 ? 's' : ''} waiting for approval
          </Text>
          <Text variant="smallBold" color="warning">
            Review →
          </Text>
        </Card>
      ) : null}

      <View style={styles.row}>
        <StatTile label="Pending workers" value={pendingWorkers} icon="hourglass-outline" tone="warning" onPress={() => router.navigate('/admin/approvals')} />
        <StatTile label="Pending employers" value={pendingEmployers} icon="business-outline" tone="warning" onPress={() => router.navigate('/admin/approvals')} />
      </View>
      <View style={styles.row}>
        <StatTile label="Paying workers" value={s?.activeSubscribers ?? 0} icon="shield-checkmark-outline" hint={`${s?.workers.APPROVED ?? 0} approved`} />
        <StatTile label="Approved employers" value={s?.employers.APPROVED ?? 0} icon="briefcase-outline" tone="info" />
      </View>
      <View style={styles.row}>
        <StatTile label="Open jobs" value={s?.openJobs ?? 0} icon="megaphone-outline" tone="accent" onPress={() => router.push('/manage/jobs')} />
        <StatTile label="Active hires" value={s?.activeHires ?? 0} icon="flash-outline" hint={`${s?.completedHires ?? 0} completed`} />
      </View>

      <Card style={{ gap: spacing.lg }}>
        <View>
          <Text variant="subheading">Revenue, last 7 days</Text>
          <Text variant="caption" color="textMuted">
            Tap a day to see its total
          </Text>
        </View>
        {r ? <RevenueChart data={r.last7Days} currency={currency} /> : <Skeleton height={150} />}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subheading">Revenue by source</Text>
        {purposes.map((p) => (
          <View key={p.key} style={{ gap: 6 }}>
            <View style={styles.purposeHead}>
              <Text variant="smallMedium">{purposeLabel[p.key]}</Text>
              <Text variant="smallBold">
                {money(p.amount, currency)}{' '}
                <Text variant="caption" color="textMuted">
                  · {p.count}
                </Text>
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.fill, { width: `${(p.amount / purposeMax) * 100}%`, backgroundColor: colors.chart }]} />
            </View>
          </View>
        ))}
      </Card>

      <Text variant="caption" color="textSubtle" align="center">
        {s ? `${s.users.toLocaleString('en-IN')} registered users` : ' '}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { fontFamily: fonts.bold, fontSize: 44, lineHeight: 52, letterSpacing: -1 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  purposeHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});
