import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo, type ReactElement } from 'react';
import { RefreshControl, View, type StyleProp, type ViewStyle } from 'react-native';

import { ErrorState, SkeletonList } from '@/components/ui';
import { errorMessage } from '@/store/api';
import { spacing, useTheme } from '@/theme';
import { ListFooter } from './ListFooter';

/** The parts of an RTK Query infinite-query result this list needs. */
export type PagedQuery<T> = {
  data?: { pages: { items: T[] }[] };
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  refetch: () => unknown;
  fetchNextPage: () => unknown;
};

/** Flatten the loaded pages (optionally filtered) once per change. */
export function usePagedItems<T>(query: PagedQuery<T>, filter?: (item: T) => boolean): T[] {
  const pages = query.data?.pages;
  return useMemo(() => {
    const items = pages?.flatMap((p) => p.items) ?? [];
    return filter ? items.filter(filter) : items;
  }, [pages, filter]);
}

type Props<T extends { id: string }> = {
  query: PagedQuery<T>;
  renderItem: (item: T) => ReactElement;
  /** Shown when the list is empty (after loading, without error). */
  empty: ReactElement;
  /** Client-side filter, e.g. for segmented tabs over one query. */
  filter?: (item: T) => boolean;
  header?: ReactElement | null;
  gap?: number;
  horizontalPadding?: number;
  contentStyle?: StyleProp<ViewStyle>;
  skeletons?: number;
  refreshOffset?: number;
};

/**
 * Paginated list with everything a feed needs: skeletons on first load, error + retry,
 * empty state, pull-to-refresh, infinite scroll and an end-of-list footer.
 */
export function InfiniteList<T extends { id: string }>({
  query,
  renderItem,
  empty,
  filter,
  header,
  gap = spacing.md,
  horizontalPadding = spacing.xl,
  contentStyle,
  skeletons = 3,
  refreshOffset,
}: Props<T>) {
  const { colors } = useTheme();
  const items = usePagedItems(query, filter);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const renderRow = useCallback(
    ({ item }: { item: T }) => <View style={{ paddingHorizontal: horizontalPadding, paddingBottom: gap }}>{renderItem(item)}</View>,
    [gap, horizontalPadding, renderItem],
  );

  const placeholder = query.isLoading ? (
    <View style={{ paddingHorizontal: horizontalPadding }}>
      <SkeletonList count={skeletons} />
    </View>
  ) : query.isError ? (
    <ErrorState message={errorMessage(query.error)} onRetry={query.refetch} />
  ) : (
    empty
  );

  return (
    <FlashList
      data={query.isLoading ? [] : items}
      keyExtractor={(item) => item.id}
      renderItem={renderRow}
      ListHeaderComponent={header}
      ListEmptyComponent={placeholder}
      ListFooterComponent={<ListFooter loading={isFetchingNextPage} done={!hasNextPage} count={items.length} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={query.isFetching && !query.isLoading && !isFetchingNextPage}
          onRefresh={query.refetch}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressViewOffset={refreshOffset}
        />
      }
    />
  );
}
