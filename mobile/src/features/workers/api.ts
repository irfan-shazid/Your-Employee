import { api, pageParams } from '@/store/api';
import type { WorkerFilters } from '@/store/slices/filters';
import type { Page, PublicWorker, WorkerDetail } from '@/types/api';

export const workersApi = api.injectEndpoints({
  endpoints: (build) => ({
    /** Employer-facing directory (approved, subscribed, available workers). */
    getWorkers: build.infiniteQuery<Page<PublicWorker>, WorkerFilters, string>({
      infiniteQueryOptions: pageParams,
      query: ({ queryArg, pageParam }) => ({ url: '/workers', params: { ...queryArg, cursor: pageParam } }),
      providesTags: ['Workers'],
    }),

    getWorker: build.query<WorkerDetail, string>({
      query: (id) => `/workers/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Worker', id }],
    }),
  }),
});

export const { useGetWorkersInfiniteQuery, useGetWorkerQuery, usePrefetch: useWorkersPrefetch } = workersApi;
