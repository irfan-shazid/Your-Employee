import type { AppThunk } from '@/store';
import { hidePaymentPicker, showPaymentPicker } from '@/store/slices/ui';
import type { PaymentProvider, PaymentPurpose } from '@/types/api';

// The pending promise's resolver isn't serialisable, so it lives here rather than in Redux.
let resolvePending: ((provider: PaymentProvider | null) => void) | null = null;

/**
 * Open the payment method sheet (rendered once by <PaymentMethodSheet /> in the root layout)
 * and resolve with the chosen gateway, or null if the user closes it.
 */
export const choosePaymentMethod =
  (purpose: PaymentPurpose): AppThunk<Promise<PaymentProvider | null>> =>
  (dispatch) => {
    resolvePending?.(null);
    dispatch(showPaymentPicker({ purpose }));
    return new Promise((resolve) => {
      resolvePending = resolve;
    });
  };

/** Called by the sheet: a method was picked (or null when dismissed). */
export const resolvePaymentMethod =
  (provider: PaymentProvider | null): AppThunk =>
  (dispatch) => {
    dispatch(hidePaymentPicker());
    resolvePending?.(provider);
    resolvePending = null;
  };
