import { api } from '@/store/api';
import type { Meta } from '@/types/api';

export const metaApi = api.injectEndpoints({
  endpoints: (build) => ({
    /** Categories, divisions/districts, pricing and feature flags — cached for an hour. */
    getMeta: build.query<Meta, void>({
      query: () => '/meta',
      providesTags: ['Meta'],
      keepUnusedDataFor: 60 * 60,
    }),
  }),
});

export const { useGetMetaQuery } = metaApi;
