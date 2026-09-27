import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, MenuRow, Segmented, Text } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { signOutEverywhere } from '@/features/auth/session';
import { errorMessage } from '@/store/api';
import { useDeleteAccountMutation } from '@/features/account/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { changeTheme, toast, type ThemePreference } from '@/store/slices/ui';
import { spacing } from '@/theme';

/** Appearance, payments, sign out and account deletion — shared by every role's profile tab. */
export function AccountSection({ showPayments = true }: { showPayments?: boolean }) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.themePreference);
  const [deleteAccount] = useDeleteAccountMutation();

  const onSignOut = async () => {
    if (await confirm({ title: 'Sign out?', confirmText: 'Sign out' })) await signOutEverywhere(dispatch);
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete your account?',
      message: 'Your profile, jobs, hires and reviews will be permanently deleted. This cannot be undone.',
      confirmText: 'Delete forever',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAccount().unwrap();
      await signOutEverywhere(dispatch);
      dispatch(toast('success', 'Account deleted'));
    } catch (err) {
      dispatch(toast('error', "Couldn't delete account", errorMessage(err)));
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ gap: spacing.md }}>
        <Text variant="overline" color="textMuted">
          Appearance
        </Text>
        <Segmented<ThemePreference>
          value={theme}
          onChange={(v) => dispatch(changeTheme(v))}
          options={[
            { value: 'system', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Card>
      <Card padded={false} style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }}>
        {showPayments ? <MenuRow icon="receipt-outline" label="Payment history" onPress={() => router.push('/payments')} /> : null}
        <MenuRow icon="log-out-outline" label="Sign out" onPress={onSignOut} />
        <MenuRow icon="trash-outline" label="Delete account" hint="Permanently remove your data" danger onPress={onDelete} />
      </Card>
      <Text variant="caption" color="textSubtle" align="center">
        Your Employee · v1.0.0
      </Text>
    </View>
  );
}
