import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountSection } from '@/features/account/AccountSection';
import { Avatar, Card, MenuRow, Text } from '@/components/ui';
import { useGetMeQuery } from '@/features/account/api';
import { useGetUnreadCountQuery } from '@/features/notifications/api';
import { spacing, useTheme } from '@/theme';

export default function AdminMore() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: me } = useGetMeQuery();
  const { data: unread } = useGetUnreadCountQuery();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: spacing.huge, gap: spacing.lg }}
    >
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar uri={me?.user.image} name={me?.user.name} size={52} />
        <View style={{ flex: 1 }}>
          <Text variant="subheading">{me?.user.name}</Text>
          <Text variant="small" color="textMuted">
            {me?.user.email} · Admin
          </Text>
        </View>
      </Card>

      <Card padded={false} style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }}>
        <MenuRow icon="people-outline" label="Users" hint="Everyone who signed up" onPress={() => router.push('/manage/users')} />
        <MenuRow icon="megaphone-outline" label="Jobs" hint="Moderate job posts" onPress={() => router.push('/manage/jobs')} />
        <MenuRow icon="grid-outline" label="Categories" hint="Add or edit types of work" onPress={() => router.push('/manage/categories')} />
        <MenuRow
          icon="notifications-outline"
          label="Notifications"
          hint={unread?.count ? `${unread.count} unread` : 'New registrations and updates'}
          onPress={() => router.push('/notifications')}
        />
      </Card>

      <AccountSection showPayments={false} />
    </ScrollView>
  );
}
