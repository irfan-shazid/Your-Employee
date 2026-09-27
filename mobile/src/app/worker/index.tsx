import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchField } from '@/components/form/SearchField';
import { FilterSheet } from '@/components/lists/FilterSheet';
import { InfiniteList } from '@/components/lists/InfiniteList';
import { Avatar, EmptyState, IconButton, Text } from '@/components/ui';
import { useGetMeQuery } from '@/features/account/api';
import { useGetJobsInfiniteQuery } from '@/features/jobs/api';
import { CategoryRail } from '@/features/jobs/CategoryRail';
import { JobCard } from '@/features/jobs/JobCard';
import { useMeta } from '@/features/meta/useMeta';
import { useGetUnreadCountQuery } from '@/features/notifications/api';
import { SubscriptionBanner } from '@/features/payments/SubscriptionBanner';
import { useDebounced } from '@/hooks/useDebounced';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { resetJobFilters, setJobFilters } from '@/store/slices/filters';
import { fonts, radii, spacing, useTheme } from '@/theme';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'wage', label: 'Highest pay' },
  { value: 'start', label: 'Starting soon' },
] as const;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Worker home: job feed filtered by category, district and search. */
export default function FindWork() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { categories, pricing } = useMeta();
  const worker = useGetMeQuery().data?.worker;
  const unread = useGetUnreadCountQuery().data?.count;
  const filters = useAppSelector((s) => s.filters.jobs);
  const [search, setSearch] = useState(filters.q ?? '');
  const [filterOpen, setFilterOpen] = useState(false);
  const q = useDebounced(search.trim());

  // Start with jobs in the worker's own district ('' = the user chose "all districts").
  const seeded = filters.district !== undefined;
  useEffect(() => {
    if (!seeded && worker) dispatch(setJobFilters({ district: worker.district }));
  }, [dispatch, seeded, worker]);

  // Wait for the district seed so we don't fetch the whole country first.
  const jobs = useGetJobsInfiniteQuery({ ...filters, q: q || undefined }, { skip: !seeded });
  const activeFilters = (filters.district ? 1 : 0) + (filters.urgent ? 1 : 0) + (filters.sort !== 'newest' ? 1 : 0);

  const clearAll = () => {
    setSearch('');
    dispatch(resetJobFilters());
    dispatch(setJobFilters({ district: '' }));
  };

  const header = (
    <View style={{ marginBottom: spacing.md }}>
      <LinearGradient
        colors={[colors.heroFrom, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + spacing.md }]}
      >
        <View style={styles.heroTop}>
          <Avatar uri={worker?.avatarUrl} name={worker?.fullName} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroSmall}>{greeting()},</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {worker?.fullName.split(' ')[0] ?? ''}
            </Text>
          </View>
          <IconButton icon="notifications-outline" variant="glass" badge={unread} accessibilityLabel="Notifications" onPress={() => router.push('/worker/alerts')} />
        </View>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search jobs, e.g. mason, driver"
          activeFilters={activeFilters}
          onOpenFilters={() => setFilterOpen(true)}
        />
      </LinearGradient>

      {worker && !worker.subscriptionActive ? (
        <View style={styles.section}>
          <SubscriptionBanner price={pricing.workerMonthly} />
        </View>
      ) : null}

      <View style={{ marginTop: spacing.lg }}>
        <CategoryRail categories={categories} value={filters.categoryId} onChange={(categoryId) => dispatch(setJobFilters({ categoryId }))} />
      </View>

      <View style={[styles.section, styles.listHead]}>
        <Text variant="heading">{filters.district ? `Jobs in ${filters.district}` : 'Jobs across Bangladesh'}</Text>
        {filters.district ? (
          <Pressable onPress={() => dispatch(setJobFilters({ district: '' }))} hitSlop={8} accessibilityRole="button">
            <Text variant="smallBold" color="primary">
              Show all
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <InfiniteList
        query={seeded ? jobs : { ...jobs, isLoading: true }}
        header={header}
        renderItem={(job) => <JobCard job={job} />}
        refreshOffset={insets.top}
        empty={
          <EmptyState
            icon="briefcase-outline"
            title="No jobs found"
            message={
              filters.district
                ? `No open jobs in ${filters.district} right now. Try all districts or another category.`
                : 'Try another category or search term.'
            }
            actionLabel={filters.district || filters.categoryId || q ? 'Clear filters' : undefined}
            onAction={clearAll}
          />
        }
      />

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        district={filters.district || undefined}
        sort={filters.sort}
        urgent={filters.urgent === 'true'}
        showUrgent
        sortOptions={SORTS}
        onApply={(v) => dispatch(setJobFilters({ district: v.district ?? '', sort: v.sort, urgent: v.urgent ? 'true' : undefined }))}
        onReset={() => dispatch(setJobFilters({ district: '', sort: 'newest', urgent: undefined }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
    borderBottomLeftRadius: radii.xxl,
    borderBottomRightRadius: radii.xxl,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroSmall: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  heroName: { color: '#fff', fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl },
});
