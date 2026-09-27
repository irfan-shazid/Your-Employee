import { router } from 'expo-router';

import { EmployerProfileForm } from '@/features/account/EmployerProfileForm';
import { WorkerProfileForm } from '@/features/account/worker-form/WorkerProfileForm';
import { useGetMeQuery } from '@/features/account/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';

/** Edit an approved profile. Changing identity details (name, NID…) sends it back for review. */
export default function EditProfile() {
  const dispatch = useAppDispatch();
  const { data: me } = useGetMeQuery();

  const done = () => {
    dispatch(toast('success', 'Profile saved'));
    if (router.canGoBack()) router.back();
  };

  if (me?.worker) {
    return <WorkerProfileForm initial={me.worker} onSaved={done} onBack={() => router.back()} submitLabel="Save changes" />;
  }
  if (me?.employer) {
    return <EmployerProfileForm initial={me.employer} onSaved={done} title="Edit profile" submitLabel="Save changes" />;
  }
  return null;
}
