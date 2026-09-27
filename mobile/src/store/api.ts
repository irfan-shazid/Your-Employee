import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { Platform } from 'react-native';

import { getAuthCookie } from '@/lib/auth-client';
import { API_URL } from '@/lib/config';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_URL}/api`,
  credentials: Platform.OS === 'web' ? 'include' : 'omit',
  timeout: 20_000,
  prepareHeaders: async (headers) => {
    const cookie = await getAuthCookie();
    if (cookie) headers.set('Cookie', cookie);
    return headers;
  },
});

export type ApiErrorBody = { error?: { code?: string; message?: string; details?: Record<string, string> } };

/** Strips undefined/empty query params so cache keys stay stable. */
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  if (typeof args !== 'string' && args.params) {
    args = {
      ...args,
      params: Object.fromEntries(Object.entries(args.params).filter(([, v]) => v !== undefined && v !== null && v !== '')),
    };
  }
  return rawBaseQuery(args, api, extra);
};

/** Cache tags: queries provide them, mutations invalidate them. */
const TAG_TYPES = [
  'Meta',
  'Me',
  'Job',
  'MyJobs',
  'Jobs',
  'Applications',
  'Applicants',
  'Workers',
  'Worker',
  'Hires',
  'Hire',
  'Payments',
  'Notifications',
  'UnreadCount',
  'AdminStats',
  'AdminQueue',
  'AdminProfile',
  'AdminUsers',
  'AdminPayments',
  'AdminJobs',
  'AdminCategories',
] as const;

export type TagType = (typeof TAG_TYPES)[number];
export type TagDescription = TagType | { type: TagType; id: string };

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: TAG_TYPES,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  keepUnusedDataFor: 120,
  endpoints: () => ({}),
});

/** Cursor pagination shared by every infinite list (`?cursor=<id>`; `nextCursor: null` = last page). */
export const pageParams = {
  initialPageParam: '',
  getNextPageParam: (last: { nextCursor: string | null }) => last.nextCursor,
};

/** Human-readable message from any RTK Query / fetch error. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error || typeof error !== 'object') return fallback;
  const e = error as FetchBaseQueryError & { message?: string };
  if ('status' in e) {
    if (e.status === 'FETCH_ERROR') return "Can't reach the server. Check your internet connection.";
    if (e.status === 'TIMEOUT_ERROR') return 'The server took too long to respond. Please try again.';
    const body = (e as { data?: ApiErrorBody }).data;
    if (body?.error?.message) return body.error.message;
    if (e.status === 429) return 'Too many requests. Please slow down a little.';
  }
  if (typeof e.message === 'string') return e.message;
  return fallback;
}

export function errorCode(error: unknown): string | undefined {
  const body = (error as { data?: ApiErrorBody } | undefined)?.data;
  return body?.error?.code;
}

export function fieldErrors(error: unknown): Record<string, string> {
  const body = (error as { data?: ApiErrorBody } | undefined)?.data;
  return body?.error?.details ?? {};
}
