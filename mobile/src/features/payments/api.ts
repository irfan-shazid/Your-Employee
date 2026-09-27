import { api, pageParams } from '@/store/api';
import type { Page, Payment, PaymentProvider, PaymentPurpose } from '@/types/api';

export const paymentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    initPayment: build.mutation<
      { tranId: string; provider: PaymentProvider; gatewayUrl: string; amount: number; currency: string },
      { provider?: PaymentProvider; purpose: PaymentPurpose; referenceId?: string; redirectUrl: string }
    >({
      query: (body) => ({ url: '/payments/init', method: 'POST', body }),
    }),

    /** Payment status; the server reconciles with the gateway (SSLCommerz / Stripe) if it is still pending. */
    getPayment: build.query<{ payment: Payment }, string>({
      query: (tranId) => `/payments/${tranId}`,
      keepUnusedDataFor: 0,
    }),

    getPayments: build.infiniteQuery<Page<Payment>, void, string>({
      infiniteQueryOptions: pageParams,
      query: ({ pageParam }) => ({ url: '/payments', params: { cursor: pageParam } }),
      providesTags: ['Payments'],
    }),
  }),
});

export const { useInitPaymentMutation, useLazyGetPaymentQuery, useGetPaymentsInfiniteQuery } = paymentsApi;
