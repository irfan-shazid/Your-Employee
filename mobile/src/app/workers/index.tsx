import { useState } from 'react';
import { View } from 'react-native';

import { SearchField } from '@/components/form/SearchField';
import { FilterSheet } from '@/components/lists/FilterSheet';
import { InfiniteList } from '@/components/lists/InfiniteList';
import { AppHeader, EmptyState } from '@/components/ui';
import { CategoryRail } from '@/features/jobs/CategoryRail';
import { useMeta } from '@/features/meta/useMeta';
import { useGetWorkersInfiniteQuery } from '@/features/workers/api';
import { WorkerCard } from '@/features/workers/WorkerCard';
import { useDebounced } from '@/hooks/useDebounced';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setWorkerFilters } from '@/store/slices/filters';
import { spacing, useTheme } from '@/theme';

const SORTS = [
  { value: 'rating', label: 'Top rated' },
  { value: 'experience', label: 'Most experienced' },
  { value: 'wage', label: 'Lowest wage' },
  { value: 'newest', label: 'Newest' },
] as const;

/** Employers find workers by category & district — no job post needed. */
export default function FindWorkers() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { categories, categoryById } = useMeta();
  const filters = useAppSelector((s) => s.filters.workers);
  const [search, setSearch] = useState(filters.q ?? '');
  const [filterOpen, setFilterOpen] = useState(false);
  const q = useDebounced(search.trim());

  const workers = useGetWorkersInfiniteQuery({ ...filters, q: q || undefined });
  const category = filters.categoryId ? categoryById.get(filters.categoryId) : undefined;
  const activeFilters = (filters.district ? 1 : 0) + (filters.sort !== 'rating' ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={category?.name ?? 'Find workers'} subtitle={filters.district ? `in ${filters.district}` : 'All of Bangladesh'} />
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, skill or area"
          activeFilters={activeFilters}
          onOpenFilters={() => setFilterOpen(true)}
        />
      </View>
      <View style={{ paddingBottom: spacing.md }}>
        <CategoryRail categories={categories} value={filters.categoryId} onChange={(categoryId) => dispatch(setWorkerFilters({ categoryId }))} />
      </View>

      <InfiniteList
        query={workers}
        skeletons={4}
        renderItem={(worker) => <WorkerCard worker={worker} />}
        empty={
          <EmptyState
            icon="people-outline"
            title="No workers found"
            message={
              filters.district
                ? `No available workers in ${filters.district} for this search. Try all districts.`
                : 'Try another category or search term.'
            }
            actionLabel={filters.district ? 'Search all districts' : undefined}
            onAction={() => dispatch(setWorkerFilters({ district: undefined }))}
          />
        }
      />

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        district={filters.district}
        sort={filters.sort}
        sortOptions={SORTS}
        onApply={(v) => dispatch(setWorkerFilters({ district: v.district, sort: v.sort }))}
        onReset={() => dispatch(setWorkerFilters({ district: undefined, sort: 'rating' }))}
      />
    </View>
  );
}
