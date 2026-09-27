import { api } from '@/store/api';
import type { Availability, EmployerType, Gender, Me, OwnEmployer, OwnWorker, WageType } from '@/types/api';

export type WorkerProfileInput = {
  fullName: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  nidNumber: string;
  nidImageId?: string | null;
  avatarUrl?: string | null;
  division: string;
  district: string;
  area: string;
  address?: string | null;
  bio?: string | null;
  skills: string[];
  experienceYears: number;
  expectedWage: number;
  wageType: WageType;
  availability: Availability;
  categoryIds: string[];
};

export type EmployerProfileInput = {
  type: EmployerType;
  fullName: string;
  companyName?: string | null;
  phone: string;
  nidNumber?: string | null;
  tradeLicense?: string | null;
  avatarUrl?: string | null;
  division: string;
  district: string;
  area: string;
  address?: string | null;
  about?: string | null;
};

export const accountApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<Me, void>({
      query: () => '/me',
      providesTags: ['Me'],
      keepUnusedDataFor: 60 * 60,
    }),

    saveWorkerProfile: build.mutation<{ worker: OwnWorker }, WorkerProfileInput>({
      query: (body) => ({ url: '/me/worker', method: 'PUT', body }),
      invalidatesTags: ['Me'],
    }),

    saveEmployerProfile: build.mutation<{ employer: OwnEmployer }, EmployerProfileInput>({
      query: (body) => ({ url: '/me/employer', method: 'PUT', body }),
      invalidatesTags: ['Me'],
    }),

    setAvailability: build.mutation<{ isAvailable: boolean }, boolean>({
      query: (isAvailable) => ({ url: '/me/availability', method: 'PATCH', body: { isAvailable } }),
      // Optimistic: the switch flips instantly and rolls back if the request fails.
      async onQueryStarted(isAvailable, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          accountApi.util.updateQueryData('getMe', undefined, (draft) => {
            if (draft.worker) draft.worker.isAvailable = isAvailable;
          }),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),

    deleteAccount: build.mutation<{ ok: true }, void>({
      query: () => ({ url: '/me', method: 'DELETE' }),
    }),

    uploadMedia: build.mutation<{ id: string; url: string }, { data: string; mime: string; purpose: 'avatar' | 'nid' }>({
      query: (body) => ({ url: '/media', method: 'POST', body }),
    }),
  }),
});

export const {
  useGetMeQuery,
  useSaveWorkerProfileMutation,
  useSaveEmployerProfileMutation,
  useSetAvailabilityMutation,
  useDeleteAccountMutation,
  useUploadMediaMutation,
} = accountApi;
