import { api, pageParams } from '@/store/api';
import type { Hire, HireStatus, Page, WageType } from '@/types/api';

export type DirectHireInput = {
  workerId: string;
  categoryId: string;
  title: string;
  description?: string | null;
  wageAmount: number;
  wageType: WageType;
  startDate: string;
  division: string;
  district: string;
  area: string;
  address?: string | null;
  useCredit: boolean;
};

type HireRef = { id: string; workerId: string };

export const hiresApi = api.injectEndpoints({
  endpoints: (build) => ({
    getHires: build.infiniteQuery<Page<Hire>, { status?: HireStatus }, string>({
      infiniteQueryOptions: pageParams,
      query: ({ queryArg, pageParam }) => ({ url: '/hires', params: { ...queryArg, cursor: pageParam } }),
      providesTags: ['Hires'],
    }),

    getHire: build.query<{ hire: Hire; viewer: 'EMPLOYER' | 'WORKER' | 'ADMIN'; fee: number }, string>({
      query: (id) => `/hires/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Hire', id }],
    }),

    createDirectHire: build.mutation<{ hire: Hire; requiresPayment: boolean; fee: number }, DirectHireInput>({
      query: (body) => ({ url: '/hires', method: 'POST', body }),
      invalidatesTags: (_r, _e, { workerId }) => ['Hires', 'Me', { type: 'Worker', id: workerId }],
    }),

    /** Worker accepts / declines; employer completes / cancels. */
    hireAction: build.mutation<unknown, HireRef & { action: 'accept' | 'decline' | 'complete' | 'cancel' }>({
      query: ({ id, action }) => ({ url: `/hires/${id}/${action}`, method: 'POST' }),
      invalidatesTags: (_r, _e, { id, workerId }) => [{ type: 'Hire', id }, 'Hires', 'MyJobs', 'Me', 'UnreadCount', { type: 'Worker', id: workerId }],
    }),

    reviewHire: build.mutation<unknown, HireRef & { rating: number; comment?: string }>({
      query: ({ id, rating, comment }) => ({ url: `/hires/${id}/review`, method: 'POST', body: { rating, comment } }),
      invalidatesTags: (_r, _e, { id, workerId }) => [{ type: 'Hire', id }, 'Hires', { type: 'Worker', id: workerId }, 'Workers'],
    }),
  }),
});

export const {
  useGetHiresInfiniteQuery,
  useGetHireQuery,
  useCreateDirectHireMutation,
  useHireActionMutation,
  useReviewHireMutation,
  usePrefetch: useHiresPrefetch,
} = hiresApi;
