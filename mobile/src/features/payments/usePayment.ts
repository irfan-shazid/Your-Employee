import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';

import { useMeta } from '@/features/meta/useMeta';
import { api, errorMessage, type TagDescription } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import type { PaymentProvider, PaymentPurpose } from '@/types/api';
import { useInitPaymentMutation, useLazyGetPaymentQuery } from './api';
import { choosePaymentMethod } from './methodPicker';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const successCopy: Record<PaymentPurpose, { title: string; message: string }> = {
  WORKER_SUBSCRIPTION: { title: 'Plan activated 🎉', message: 'You can now apply for jobs and appear in searches.' },
  JOB_POST: { title: 'Your job is live', message: 'Workers nearby are being notified.' },
  HIRE: { title: 'Payment received', message: 'The worker has been notified.' },
};

/** Only refresh what a payment actually changed. */
function staleAfter(purpose: PaymentPurpose, referenceId?: string): TagDescription[] {
  const common: TagDescription[] = ['Payments', 'Notifications', 'UnreadCount'];
  switch (purpose) {
    case 'WORKER_SUBSCRIPTION':
      return [...common, 'Me', 'Jobs'];
    case 'JOB_POST':
      return [...common, 'MyJobs', ...(referenceId ? [{ type: 'Job' as const, id: referenceId }] : [])];
    case 'HIRE':
      return [...common, 'Me', 'Hires', 'Applicants', 'MyJobs', 'Job', 'Worker', ...(referenceId ? [{ type: 'Hire' as const, id: referenceId }] : [])];
  }
}

/** Ask the server for the final status; it reconciles with the gateway if still pending. */
async function waitForResult(fetchStatus: () => Promise<string>) {
  let status = 'PENDING';
  for (let attempt = 0; attempt < 4 && status === 'PENDING'; attempt++) {
    if (attempt) await sleep(attempt === 1 ? 1200 : 2000);
    status = await fetchStatus();
  }
  return status;
}

/**
 * Hosted checkout (SSLCommerz or Stripe):
 * 1. the user picks a method when more than one is enabled → 2. the server creates a session →
 * 3. the hosted page opens in an in-app browser → 4. it redirects back via deep link →
 * 5. we confirm the result with the server (never trusting the redirect alone).
 */
export function usePayment() {
  const dispatch = useAppDispatch();
  const { paymentMethods } = useMeta();
  const [initPayment] = useInitPaymentMutation();
  const [fetchPayment] = useLazyGetPaymentQuery();
  const [paying, setPaying] = useState(false);

  const pay = useCallback(
    async (purpose: PaymentPurpose, referenceId?: string): Promise<boolean> => {
      // With a single gateway there is nothing to choose; with none, the server explains why.
      const enabled = paymentMethods.filter((m) => m.enabled);
      let provider: PaymentProvider | undefined = enabled[0]?.id;
      if (enabled.length > 1) {
        const chosen = await dispatch(choosePaymentMethod(purpose));
        if (!chosen) return false;
        provider = chosen;
      }

      setPaying(true);
      try {
        const redirectUrl = Linking.createURL('payment-result');
        const { tranId, gatewayUrl } = await initPayment({ provider, purpose, referenceId, redirectUrl }).unwrap();
        await WebBrowser.openAuthSessionAsync(gatewayUrl, redirectUrl, { showInRecents: true });

        const status = await waitForResult(async () => (await fetchPayment(tranId).unwrap()).payment.status);

        if (status === 'SUCCESS') {
          dispatch(api.util.invalidateTags(staleAfter(purpose, referenceId)));
          dispatch(toast('success', successCopy[purpose].title, successCopy[purpose].message));
          return true;
        }
        if (status === 'CANCELLED') dispatch(toast('info', 'Payment cancelled', 'No money was taken.'));
        else if (status === 'FAILED') dispatch(toast('error', 'Payment failed', 'Please try again or use another method.'));
        else dispatch(toast('info', 'Payment is processing', "We'll update your account as soon as it's confirmed."));
        return false;
      } catch (err) {
        dispatch(toast('error', 'Payment could not start', errorMessage(err)));
        return false;
      } finally {
        setPaying(false);
      }
    },
    [dispatch, fetchPayment, initPayment, paymentMethods],
  );

  return { pay, paying };
}
