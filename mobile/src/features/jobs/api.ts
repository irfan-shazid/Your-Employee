import { api, pageParams } from '@/store/api';
import type { JobFilters } from '@/store/slices/filters';
import type { Applicant, Hire, Job, JobDetail, JobListItem, JobStatus, MyApplication, Page, WageType } from '@/types/api';

export type CreateJobInput = {
  title: string;
  categoryId: string;
  description: string;
  wageAmount: number;
  wageType: WageType;
  workersNeeded: number;
  startDate: string;
  durationDays: number;
  division: string;
  district: string;
  area: string;
  address?: string | null;
  isUrgent: boolean;
};

type JobRef = { id: string; jobId: string };

export const jobsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ─── Jobs ───────────────────────────────────────────────────────────
    getJobs: build.infiniteQuery<Page<JobListItem>, JobFilters, string>({
      infiniteQueryOptions: pageParams,
      query: ({ queryArg, pageParam }) => ({ url: '/jobs', params: { ...queryArg, cursor: pageParam } }),
      providesTags: ['Jobs'],
    }),

    getJob: build.query<JobDetail, string>({
      query: (id) => `/jobs/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Job', id }],
    }),

    getMyJobs: build.infiniteQuery<Page<Job>, { status?: JobStatus }, string>({
      infiniteQueryOptions: pageParams,
      query: ({ queryArg, pageParam }) => ({ url: '/jobs/mine', params: { ...queryArg, cursor: pageParam } }),
      providesTags: ['MyJobs'],
    }),

    createJob: build.mutation<{ job: Job; fee: number }, CreateJobInput>({
      query: (body) => ({ url: '/jobs', method: 'POST', body }),
      invalidatesTags: ['MyJobs'],
    }),

    setJobOpen: build.mutation<{ job: Job }, { id: string; open: boolean }>({
      query: ({ id, open }) => ({ url: `/jobs/${id}/${open ? 'reopen' : 'close'}`, method: 'POST' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Job', id }, 'MyJobs', 'Jobs'],
    }),

    deleteJob: build.mutation<{ ok: true }, string>({
      query: (id) => ({ url: `/jobs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MyJobs'],
    }),

    applyToJob: build.mutation<unknown, { jobId: string; message?: string }>({
      query: ({ jobId, message }) => ({ url: `/jobs/${jobId}/apply`, method: 'POST', body: { message } }),
      invalidatesTags: (_r, _e, { jobId }) => [{ type: 'Job', id: jobId }, 'Jobs', 'Applications'],
    }),

    getApplicants: build.query<{ items: Applicant[] }, string>({
      query: (jobId) => `/jobs/${jobId}/applications`,
      providesTags: (_r, _e, jobId) => [{ type: 'Applicants', id: jobId }],
    }),

    // ─── Applications ───────────────────────────────────────────────────
    getMyApplications: build.infiniteQuery<Page<MyApplication>, void, string>({
      infiniteQueryOptions: pageParams,
      query: ({ pageParam }) => ({ url: '/applications/mine', params: { cursor: pageParam } }),
      providesTags: ['Applications'],
    }),

    withdrawApplication: build.mutation<unknown, JobRef>({
      query: ({ id }) => ({ url: `/applications/${id}/withdraw`, method: 'POST' }),
      invalidatesTags: (_r, _e, { jobId }) => ['Applications', 'Jobs', { type: 'Job', id: jobId }],
    }),

    decideApplicant: build.mutation<unknown, JobRef & { action: 'shortlist' | 'reject' }>({
      query: ({ id, action }) => ({ url: `/applications/${id}/${action}`, method: 'POST' }),
      invalidatesTags: (_r, _e, { jobId }) => [{ type: 'Applicants', id: jobId }],
    }),

    hireApplicant: build.mutation<{ hire: Hire; requiresPayment: boolean; fee: number }, JobRef & { useCredit: boolean }>({
      query: ({ id, useCredit }) => ({ url: `/applications/${id}/hire`, method: 'POST', body: { useCredit } }),
      invalidatesTags: (_r, _e, { jobId }) => [{ type: 'Applicants', id: jobId }, { type: 'Job', id: jobId }, 'Hires', 'MyJobs', 'Me'],
    }),
  }),
});

export const {
  useGetJobsInfiniteQuery,
  useGetJobQuery,
  useGetMyJobsInfiniteQuery,
  useCreateJobMutation,
  useSetJobOpenMutation,
  useDeleteJobMutation,
  useApplyToJobMutation,
  useGetApplicantsQuery,
  useGetMyApplicationsInfiniteQuery,
  useWithdrawApplicationMutation,
  useDecideApplicantMutation,
  useHireApplicantMutation,
  usePrefetch: useJobsPrefetch,
} = jobsApi;
