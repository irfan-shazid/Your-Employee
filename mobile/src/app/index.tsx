import { Redirect } from 'expo-router';

import { BootScreen } from '@/components/layout/BootScreen';
import { useAppState } from '@/features/auth/useAppState';
import { useAppSelector } from '@/store/hooks';

/** Entry point: sends every user to the right place based on session + role + approval. */
export default function Index() {
  const state = useAppState();
  const role = useAppSelector((s) => s.auth.gate?.role);

  switch (state) {
    case 'signedOut':
      return <Redirect href="/welcome" />;
    case 'onboarding':
      return <Redirect href={role === 'WORKER' ? '/onboarding/worker' : role === 'EMPLOYER' ? '/onboarding/employer' : '/onboarding'} />;
    case 'pending':
      return <Redirect href="/onboarding/status" />;
    case 'worker':
      return <Redirect href="/worker" />;
    case 'employer':
      return <Redirect href="/employer" />;
    case 'admin':
      return <Redirect href="/admin" />;
    default:
      return <BootScreen offline={state === 'offline'} />;
  }
}
