import { useEffect } from 'react';

import { authClient } from '@/lib/auth-client';
import { storage } from '@/lib/storage';
import { errorCode } from '@/store/api';
import { useGetMeQuery } from '@/features/account/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { gateLoaded, sessionResolved, type Gate } from '@/store/slices/auth';
import type { Me } from '@/types/api';

export type AppState = 'loading' | 'offline' | 'signedOut' | 'onboarding' | 'pending' | 'worker' | 'employer' | 'admin';

const GATE_KEY = 'youremployee_gate';

function gateFromMe(me: Me): Gate {
  const profile = me.user.role === 'WORKER' ? me.worker : me.user.role === 'EMPLOYER' ? me.employer : null;
  return { userId: me.user.id, role: me.user.role, status: profile?.status ?? null };
}

/** Keeps Redux in sync with the Better Auth session and caches the routing gate. Mount once. */
export function useAuthSync() {
  const dispatch = useAppDispatch();
  const { data: session, isPending } = authClient.useSession();
  const status = useAppSelector((s) => s.auth.status);
  const userId = session?.user?.id ?? null;

  // Restore the cached gate so a returning user lands on their home screen instantly.
  useEffect(() => {
    storage.get(GATE_KEY).then((raw) => {
      if (!raw) return;
      try {
        dispatch(gateLoaded(JSON.parse(raw) as Gate));
      } catch {
        /* ignore corrupt cache */
      }
    });
  }, [dispatch]);

  useEffect(() => {
    if (!isPending) dispatch(sessionResolved({ userId }));
  }, [dispatch, isPending, userId]);

  const me = useGetMeQuery(undefined, { skip: status !== 'signedIn' });

  useEffect(() => {
    if (!me.data) return;
    const gate = gateFromMe(me.data);
    dispatch(gateLoaded(gate));
    storage.set(GATE_KEY, JSON.stringify(gate));
  }, [dispatch, me.data]);

  // Session expired or revoked on the server.
  useEffect(() => {
    const err = me.error as { status?: number } | undefined;
    if (err?.status === 401 || errorCode(me.error) === 'UNAUTHORIZED') {
      authClient.signOut().catch(() => {});
    }
  }, [me.error]);
}

/** Which part of the app the current user should see. */
export function useAppState(): AppState {
  const { status, gate, userId } = useAppSelector((s) => s.auth);
  const me = useGetMeQuery(undefined, { skip: status !== 'signedIn' });

  if (status === 'loading') return 'loading';
  if (status === 'signedOut') return 'signedOut';

  const current = me.data ? gateFromMe(me.data) : gate?.userId === userId ? gate : null;
  if (!current) return me.isError ? 'offline' : 'loading';

  if (current.role === 'ADMIN') return 'admin';
  if (!current.role || !current.status) return 'onboarding';
  if (current.status !== 'APPROVED') return 'pending';
  return current.role === 'WORKER' ? 'worker' : 'employer';
}

export async function clearGateCache() {
  await storage.remove(GATE_KEY);
}
