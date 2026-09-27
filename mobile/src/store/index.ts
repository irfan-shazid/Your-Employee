import { configureStore, type Action, type ThunkAction } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';

import { api } from './api';
import authReducer from './slices/auth';
import filtersReducer from './slices/filters';
import uiReducer from './slices/ui';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    ui: uiReducer,
    filters: filtersReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      // RTK Query responses contain ISO date strings only, so the default checks are cheap — but
      // disabling them in development keeps big lists snappy.
      serializableCheck: false,
      immutableCheck: false,
    }).concat(api.middleware),
});

// refetchOnFocus / refetchOnReconnect: on devices "focus" = app returns to foreground.
if (Platform.OS === 'web') {
  setupListeners(store.dispatch);
} else {
  setupListeners(store.dispatch, (dispatch, { onFocus, onFocusLost, onOnline, onOffline }) => {
    const appState = AppState.addEventListener('change', (state) =>
      dispatch(state === 'active' ? onFocus() : onFocusLost()),
    );
    const network = Network.addNetworkStateListener(({ isConnected }) =>
      dispatch(isConnected === false ? onOffline() : onOnline()),
    );
    return () => {
      appState.remove();
      network.remove();
    };
  });
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<R = void> = ThunkAction<R, RootState, unknown, Action>;
