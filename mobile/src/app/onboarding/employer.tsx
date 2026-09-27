import { router } from 'expo-router';

import { EmployerProfileForm } from '@/features/account/EmployerProfileForm';
import { useGetMeQuery } from '@/features/account/api';

export default function EmployerOnboarding() {
  const { data: me } = useGetMeQuery();
  return (
    <EmployerProfileForm
      initial={me?.employer}
      defaultName={me?.user.name}
      defaultAvatar={me?.user.image}
      onSaved={() => router.replace('/onboarding/status')}
    />
  );
}
