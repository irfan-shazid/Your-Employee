import { api, pageParams } from '@/store/api';
import type { AppNotification, Page } from '@/types/api';

export const notificationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.infiniteQuery<Page<AppNotification>, void, string>({
      infiniteQueryOptions: pageParams,
      query: ({ pageParam }) => ({ url: '/notifications', params: { cursor: pageParam } }),
      providesTags: ['Notifications'],
    }),

    getUnreadCount: build.query<{ count: number }, void>({
      query: () => '/notifications/unread-count',
      providesTags: ['UnreadCount'],
    }),

    markNotificationsRead: build.mutation<{ ok: true }, string[] | void>({
      query: (ids) => ({ url: '/notifications/read', method: 'POST', body: ids ? { ids } : {} }),
      invalidatesTags: ['UnreadCount', 'Notifications'],
    }),
  }),
});

export const { useGetNotificationsInfiniteQuery, useGetUnreadCountQuery, useMarkNotificationsReadMutation } = notificationsApi;

/** Unread badge for tab bars: polls while the app is in the foreground only. */
export function useUnreadBadge() {
  const { data } = useGetUnreadCountQuery(undefined, { pollingInterval: 45_000, skipPollingIfUnfocused: true });
  return data?.count ? data.count : undefined;
}
