import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { radii, spacing, useTheme } from '@/theme';
import type { AppNotification } from '@/types/api';

type IconName = ComponentProps<typeof Ionicons>['name'];

function visual(type: string): { icon: IconName; tone: 'primary' | 'success' | 'warning' | 'danger' | 'info' } {
  if (type.startsWith('PROFILE_APPROVED')) return { icon: 'shield-checkmark', tone: 'success' };
  if (type.startsWith('PROFILE_')) return { icon: 'alert-circle', tone: 'danger' };
  if (type === 'HIRE_CONFIRMED' || type === 'OFFER_ACCEPTED') return { icon: 'ribbon', tone: 'success' };
  if (type === 'HIRE_OFFER') return { icon: 'mail-unread', tone: 'info' };
  if (type === 'NEW_APPLICATION') return { icon: 'person-add', tone: 'primary' };
  if (type === 'JOB_MATCH' || type === 'JOB_PUBLISHED') return { icon: 'briefcase', tone: 'primary' };
  if (type === 'NEW_REVIEW') return { icon: 'star', tone: 'warning' };
  if (type === 'SUBSCRIPTION_ACTIVE') return { icon: 'card', tone: 'success' };
  if (type.includes('DECLINED') || type.includes('CANCELLED') || type.includes('REJECTED') || type.includes('REMOVED')) {
    return { icon: 'close-circle', tone: 'danger' };
  }
  if (type === 'ADMIN_APPROVAL') return { icon: 'people', tone: 'warning' };
  return { icon: 'notifications', tone: 'info' };
}

export function openNotification(n: AppNotification) {
  const d = n.data ?? {};
  if (d.hireId) router.push(`/hires/${d.hireId}`);
  else if (d.jobId && n.type === 'NEW_APPLICATION') router.push(`/jobs/${d.jobId}/applicants`);
  else if (d.jobId) router.push(`/jobs/${d.jobId}`);
  else if (d.workerId) router.push(`/manage/workers/${d.workerId}`);
  else if (d.employerId) router.push(`/manage/employers/${d.employerId}`);
}

export const NotificationItem = memo(function NotificationItem({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const { colors } = useTheme();
  const v = visual(item.type);
  const soft = { primary: colors.primarySoft, success: colors.successSoft, warning: colors.warningSoft, danger: colors.dangerSoft, info: colors.infoSoft }[v.tone];
  const fg = { primary: colors.primary, success: colors.success, warning: colors.warning, danger: colors.danger, info: colors.info }[v.tone];
  const unread = !item.readAt;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceAlt : unread ? colors.surface : 'transparent', borderColor: unread ? colors.border : 'transparent' },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: soft }]}>
        <Ionicons name={v.icon} size={20} color={fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.titleRow}>
          <Text variant="bodySemibold" style={{ flex: 1 }} numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="caption" color="textSubtle">
            {timeAgo(item.createdAt)}
          </Text>
        </View>
        <Text variant="small" color="textMuted" numberOfLines={3}>
          {item.body}
        </Text>
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: colors.accent }]} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start' },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
});
