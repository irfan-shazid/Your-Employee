import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ApprovalStatus, Role } from '@/types/api';

/**
 * Mirrors the Better Auth session plus a small cached "gate" (role + profile status)
 * so the app can route to the right home screen instantly on launch, before /me returns.
 */
export type Gate = { userId: string; role: Role | null; status: ApprovalStatus | null };

type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  userId: string | null;
  gate: Gate | null;
};

const initialState: AuthState = { status: 'loading', userId: null, gate: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionResolved(state, action: PayloadAction<{ userId: string | null }>) {
      const { userId } = action.payload;
      state.userId = userId;
      state.status = userId ? 'signedIn' : 'signedOut';
      // Drop a cached gate that belongs to someone else (or to nobody).
      if (!userId || (state.gate && state.gate.userId !== userId)) state.gate = null;
    },
    gateLoaded(state, action: PayloadAction<Gate | null>) {
      state.gate = action.payload;
    },
    signedOut(state) {
      state.status = 'signedOut';
      state.userId = null;
      state.gate = null;
    },
  },
});

export const { sessionResolved, gateLoaded, signedOut } = authSlice.actions;
export default authSlice.reducer;
