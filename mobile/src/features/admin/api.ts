import type {
  AdminCategory,
  AdminEmployer,
  AdminJob,
  AdminPayment,
  AdminStats,
  AdminUser,
  AdminWorker,
  ApprovalStatus,
  JobStatus,
  Page,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Role,
} from '@/types/api';
import { api, pageParams } from '@/store/api';

export type Decision = 'approve' | 'reject' | 'suspend' | 'reinstate';
type ProfileKind = 'workers' | 'employers';

export const adminApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAdminStats: build.query<AdminStats, void>({
      query: () => '/admin/stats',
      providesTags: ['AdminStats'],
    }),

    getAdminWorkers: build.infiniteQuery<Page<AdminWorker>, { status?: ApprovalStatus; q?: string }, string>({
      infiniteQueryOptions: pageParams,
      query: ({ queryArg, pageParam }) => ({ url: '/admin/workers', params: { ...queryArg, cursor: pageParam } }),
      providesTags: ['AdminQueue'],
    }),

    getAdminEmployers: build.infiniteQuery<Page<AdminEmployer>, { status?: ApprovalStatus; q?: string }, string>({
      infiniteQueryOptions: pageParams,
      query: ({ queryArg, pageParam }) => ({ url: '/admin/employers', params: { ...queryArg, cursor: pageParam } }),
      providesTags: ['AdminQueue'],
    }),

    getAdminWorker: build.query<{ worker: AdminWorker; counts: { hires: number; reviews: number } }, string>({
      query: (id) => `/admin/workers/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'AdminProfile', id }],
    }),

    getAdminEmployer: build.query<{ employer: AdminEmployer; counts: { jobs: number; hires: number } }, string>({
      query: (id) => `/admin/employers/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'AdminProfile', id }],
    }),

    decideProfile: build.mutation<unknown, { kind: ProfileKind; id: string; action: Decision; reason?: string }>({
      query: ({ kind, id, action, reason }) => ({
        url: `/admin/${kind}/${id}/decision`,
        method: 'POST',
        body: { action, reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'AdminProfile', id }, 'AdminQueue', 'AdminStats', 'AdminUsers'],
    }),

    getAdminUsers: build.infiniteQuery<Page<AdminUser>, { q?: string; role?: Role | 'NONE' }, string>({
      infiniteQueryOptions: pageParams,
      query: ({ queryArg, pageParam }) => ({ url: '/admin/users', params: { ...queryArg, cursor: pageParam } }),
      providesTags: ['AdminUsers'],
    }),

    getAdminPayments: build.infiniteQuery<
      Page<AdminPayment>,
      { status?: PaymentStatus; purpose?: PaymentPurpose; provider?: PaymentProvider },
      string
    >({
      infiniteQueryOptions: pageParams,
      query: ({ queryArg, pageParam }) => ({ url: '/admin/payments', params: { ...queryArg, cursor: pageParam } }),
      providesTags: ['AdminPayments'],
    }),

    getAdminJobs: build.infiniteQuery<Page<AdminJob>, { status?: JobStatus; q?: string }, string>({
      infiniteQueryOptions: pageParams,
      query: ({ queryArg, pageParam }) => ({ url: '/admin/jobs', params: { ...queryArg, cursor: pageParam } }),
      providesTags: ['AdminJobs'],
    }),

    removeJob: build.mutation<unknown, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/admin/jobs/${id}/remove`, method: 'POST', body: { reason } }),
      invalidatesTags: ['AdminJobs', 'AdminStats', 'Jobs'],
    }),

    getAdminCategories: build.query<{ items: AdminCategory[] }, void>({
      query: () => '/admin/categories',
      providesTags: ['AdminCategories'],
    }),

    saveCategory: build.mutation<
      unknown,
      { id?: string; name: string; nameBn: string; icon: string; sortOrder?: number; isActive?: boolean }
    >({
      query: ({ id, ...body }) =>
        id ? { url: `/admin/categories/${id}`, method: 'PATCH', body } : { url: '/admin/categories', method: 'POST', body },
      invalidatesTags: ['AdminCategories', 'Meta'],
    }),
  }),
});

export const {
  useGetAdminStatsQuery,
  useGetAdminWorkersInfiniteQuery,
  useGetAdminEmployersInfiniteQuery,
  useGetAdminWorkerQuery,
  useGetAdminEmployerQuery,
  useDecideProfileMutation,
  useGetAdminUsersInfiniteQuery,
  useGetAdminPaymentsInfiniteQuery,
  useGetAdminJobsInfiniteQuery,
  useRemoveJobMutation,
  useGetAdminCategoriesQuery,
  useSaveCategoryMutation,
} = adminApi;
