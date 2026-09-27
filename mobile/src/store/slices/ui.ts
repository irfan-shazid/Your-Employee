import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { storage } from '@/lib/storage';
import type { PaymentPurpose } from '@/types/api';
import type { AppThunk } from '../index';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ToastType = 'success' | 'error' | 'info';
export type Toast = { id: string; type: ToastType; title: string; message?: string };

type UiState = {
  themePreference: ThemePreference;
  toasts: Toast[];
  /** Payment method sheet, open while the user chooses how to pay (see features/payments/methodPicker). */
  paymentPicker: { purpose: PaymentPurpose } | null;
};

const initialState: UiState = { themePreference: 'system', toasts: [], paymentPicker: null };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemePreference(state, action: PayloadAction<ThemePreference>) {
      state.themePreference = action.payload;
    },
    pushToast(state, action: PayloadAction<Toast>) {
      // Keep at most 2 toasts on screen.
      state.toasts = [...state.toasts.slice(-1), action.payload];
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    showPaymentPicker(state, action: PayloadAction<{ purpose: PaymentPurpose }>) {
      state.paymentPicker = action.payload;
    },
    hidePaymentPicker(state) {
      state.paymentPicker = null;
    },
  },
});

export const { setThemePreference, dismissToast, showPaymentPicker, hidePaymentPicker } = uiSlice.actions;
export default uiSlice.reducer;

export const THEME_KEY = 'youremployee_theme';

/** Change the theme and remember it on this device. */
export const changeTheme =
  (preference: ThemePreference): AppThunk =>
  (dispatch) => {
    dispatch(setThemePreference(preference));
    storage.set(THEME_KEY, preference);
  };

export const toast =
  (type: ToastType, title: string, message?: string): AppThunk =>
  (dispatch) => {
    const id = nanoid();
    dispatch(uiSlice.actions.pushToast({ id, type, title, message }));
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        type === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : type === 'error'
            ? Haptics.NotificationFeedbackType.Error
            : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    }
    setTimeout(() => dispatch(dismissToast(id)), type === 'error' ? 4500 : 3000);
  };
