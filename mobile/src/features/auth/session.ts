import { clearGateCache } from '@/features/auth/useAppState';
import { api } from '@/store/api';
import type { AppDispatch } from '@/store';
import { signedOut } from '@/store/slices/auth';
import { authClient } from '@/lib/auth-client';

/** Sign out everywhere on this device and drop all cached server data. */
export async function signOutEverywhere(dispatch: AppDispatch) {
  try {
    await authClient.signOut();
  } catch {
    /* even if the network call fails, clear local state */
  }
  await clearGateCache();
  dispatch(signedOut());
  dispatch(api.util.resetApiState());
}
