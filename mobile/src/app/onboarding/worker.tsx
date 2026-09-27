import { router } from 'expo-router';

import { WorkerProfileForm } from '@/features/account/worker-form/WorkerProfileForm';
import { useGetMeQuery } from '@/features/account/api';

export default function WorkerOnboarding() {
  const { data: me } = useGetMeQuery();
  return (
    <WorkerProfileForm
      initial={me?.worker}
      defaultName={me?.user.name}
      defaultAvatar={me?.user.image}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/onboarding'))}
      onSaved={() => router.replace('/onboarding/status')}
    />
  );
}
