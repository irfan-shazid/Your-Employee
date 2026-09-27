import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HireCard } from '@/features/hires/HireCard';
import { JobCard } from '@/features/jobs/JobCard';
import { Avatar, Card, EmptyState, IconButton, ScalePressable, SectionTitle, SkeletonCard, Text } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { taka } from '@/lib/format';
import { useGetMeQuery } from '@/features/account/api';
import { useGetUnreadCountQuery } from '@/features/notifications/api';
import { useGetHiresInfiniteQuery } from '@/features/hires/api';
import { useGetMyJobsInfiniteQuery } from '@/features/jobs/api';
import { useAppDispatch } from '@/store/hooks';
import { resetWorkerFilters, setWorkerFilters } from '@/store/slices/filters';
import { fonts, radii, spacing, useTheme } from '@/theme';

export default function EmployerHome() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { categories, pricing } = useMeta();
  const { data: me, refetch: refetchMe } = useGetMeQuery();
  const { data: unread } = useGetUnreadCountQuery();
  const jobs = useGetMyJobsInfiniteQuery({});
  const hires = useGetHiresInfiniteQuery({});
  const employer = me?.employer;

  const recentJobs = jobs.data?.pages[0]?.items.slice(0, 3) ?? [];
  const attention = (hires.data?.pages[0]?.items ?? []).filter((h) => h.status === 'PENDING_PAYMENT' || h.status === 'ACTIVE').slice(0, 3);

  const openCategory = (categoryId?: string) => {
    dispatch(resetWorkerFilters());
    dispatch(setWorkerFilters({ categoryId, district: employer?.district }));
    router.push('/workers');
  };

  const refresh = () => {
    refetchMe();
    jobs.refetch();
    hires.refetch();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: spacing.huge }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={jobs.isFetching && !jobs.isLoading} onRefresh={refresh} tintColor="#fff" colors={[colors.primary]} />}
    >
      <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.heroTop}>
          <Avatar uri={employer?.avatarUrl} name={employer?.displayName} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroSmall}>Welcome back</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {employer?.displayName ?? ''}
            </Text>
          </View>
          <IconButton icon="notifications-outline" variant="glass" badge={unread?.count} accessibilityLabel="Notifications" onPress={() => router.push('/employer/alerts')} />
        </View>
        <Text style={styles.heroTitle}>Who do you need{'\n'}today?</Text>
      </LinearGradient>

      <View style={styles.actions}>
        <Animated.View entering={FadeInDown.delay(50)} style={{ flex: 1 }}>
          <ScalePressable onPress={() => router.push('/jobs/new')} haptic style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={24} color={colors.onPrimary} />
            </View>
            <Text variant="subheading">Post a job</Text>
            <Text variant="caption" color="textMuted">
              Workers apply to you · {taka(pricing.jobPost)}
            </Text>
          </ScalePressable>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120)} style={{ flex: 1 }}>
          <ScalePressable onPress={() => openCategory(undefined)} haptic style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="search" size={22} color="#fff" />
            </View>
            <Text variant="subheading">Find workers</Text>
            <Text variant="caption" color="textMuted">
              Hire directly · {taka(pricing.hire)}/hire
            </Text>
          </ScalePressable>
        </Animated.View>
      </View>

      <View style={styles.body}>
        {employer && employer.hireCredits > 0 ? (
          <Card style={[styles.credit, { backgroundColor: colors.infoSoft, borderColor: colors.info }]}>
            <Ionicons name="gift" size={22} color={colors.info} />
            <Text variant="bodySemibold" style={{ flex: 1, color: colors.info }}>
              You have {employer.hireCredits} free hire credit{employer.hireCredits > 1 ? 's' : ''}
            </Text>
          </Card>
        ) : null}

        <SectionTitle title="Browse by category" action="See all" onAction={() => openCategory(undefined)} />
        <View style={styles.grid}>
          {categories.slice(0, 8).map((c) => (
            <ScalePressable key={c.id} onPress={() => openCategory(c.id)} scaleTo={0.94} style={styles.cat} accessibilityLabel={c.name}>
              <View style={[styles.catIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={c.icon as never} size={24} color={colors.primary} />
              </View>
              <Text variant="caption" align="center" numberOfLines={2}>
                {c.name}
              </Text>
            </ScalePressable>
          ))}
        </View>

        {attention.length ? (
          <>
            <SectionTitle title="Needs attention" action="All hires" onAction={() => router.navigate('/employer/hires')} />
            <View style={{ gap: spacing.md }}>
              {attention.map((h) => (
                <HireCard key={h.id} hire={h} viewer="EMPLOYER" />
              ))}
            </View>
          </>
        ) : null}

        <SectionTitle title="Your recent jobs" action={recentJobs.length ? 'All jobs' : undefined} onAction={() => router.navigate('/employer/jobs')} />
        {jobs.isLoading ? (
          <SkeletonCard />
        ) : recentJobs.length ? (
          <View style={{ gap: spacing.md }}>
            {recentJobs.map((j) => (
              <JobCard key={j.id} job={j} showStatus />
            ))}
          </View>
        ) : (
          <Card>
            <EmptyState icon="briefcase-outline" title="No jobs posted yet" message="Post a job and verified workers nearby will apply." actionLabel="Post your first job" onAction={() => router.push('/jobs/new')} />
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.xl, paddingBottom: 70, gap: spacing.xl, borderBottomLeftRadius: radii.xxl, borderBottomRightRadius: radii.xxl },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroSmall: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  heroName: { color: '#fff', fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  heroTitle: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  actions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, marginTop: -48 },
  action: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: 4, boxShadow: '0px 8px 24px rgba(15,23,42,0.10)' },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  credit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg, borderWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  cat: { width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  catIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
