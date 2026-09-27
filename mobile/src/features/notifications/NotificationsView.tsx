import { View } from 'react-native';

import { InfiniteList } from '@/components/lists/InfiniteList';
import { AppHeader, Button, EmptyState } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import { useGetNotificationsInfiniteQuery, useGetUnreadCountQuery, useMarkNotificationsReadMutation } from './api';
import { NotificationItem, openNotification } from './NotificationItem';

/** Notification inbox — used as a tab (workers, employers) and as a pushed screen (admins). */
export function NotificationsView({ asTab = false }: { asTab?: boolean }) {
  const { colors } = useTheme();
  const notifications = useGetNotificationsInfiniteQuery();
  const unread = useGetUnreadCountQuery().data?.count ?? 0;
  const [markRead, { isLoading: marking }] = useMarkNotificationsReadMutation();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader
        title="Notifications"
        large={asTab}
        back={!asTab}
        subtitle={asTab && unread ? `${unread} unread` : undefined}
        right={unread ? <Button title="Mark all read" variant="ghost" size="sm" fullWidth={false} onPress={() => markRead()} loading={marking} /> : undefined}
      />
      <InfiniteList
        query={notifications}
        gap={spacing.sm}
        horizontalPadding={spacing.lg}
        skeletons={5}
        contentStyle={{ paddingTop: spacing.sm }}
        renderItem={(item) => (
          <NotificationItem
            item={item}
            onPress={() => {
              if (!item.readAt) markRead([item.id]);
              openNotification(item);
            }}
          />
        )}
        empty={<EmptyState icon="notifications-outline" title="No notifications yet" message="Updates about your jobs, hires and account will show up here." />}
      />
    </View>
  );
}
