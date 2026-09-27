import { router } from 'expo-router';
import { useCallback } from 'react';

import { usePayment } from '@/features/payments/usePayment';
import { errorMessage } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import type { Hire } from '@/types/api';

type CreateHire = () => Promise<{ hire: Pick<Hire, 'id'>; requiresPayment: boolean }>;

/**
 * Shared "create a hire → pay (unless a free credit covered it) → open the hire" flow,
 * used when hiring an applicant and when sending a direct offer.
 */
export function useHireFlow() {
  const dispatch = useAppDispatch();
  const { pay, paying } = usePayment();

  const hireAndPay = useCallback(
    async (create: CreateHire, creditMessage: string, { replace = false }: { replace?: boolean } = {}) => {
      try {
        const { hire, requiresPayment } = await create();
        if (requiresPayment) await pay('HIRE', hire.id);
        else dispatch(toast('success', 'Done 🎉', creditMessage));
        router[replace ? 'replace' : 'push'](`/hires/${hire.id}`);
        return { ok: true as const };
      } catch (error) {
        dispatch(toast('error', "Couldn't hire", errorMessage(error)));
        return { ok: false as const, error };
      }
    },
    [dispatch, pay],
  );

  return { hireAndPay, paying };
}
