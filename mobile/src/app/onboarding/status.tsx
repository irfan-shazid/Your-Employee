import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Avatar, Button, Card, InfoRow, Screen, StatusPill, Text } from '@/components/ui';
import { signOutEverywhere } from '@/features/auth/session';
import { formatDate, timeAgo } from '@/lib/format';
import { useGetMeQuery } from '@/features/account/api';
import { useAppDispatch } from '@/store/hooks';
import { radii, spacing, useTheme } from '@/theme';

/** Shown while the admin reviews the profile (or after a rejection / suspension). */
export default function ApprovalStatus() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  // Poll so the app moves on by itself as soon as the admin approves.
  const { data: me, refetch, isFetching } = useGetMeQuery(undefined, { pollingInterval: 20_000, skipPollingIfUnfocused: true });

  const profile = me?.worker ?? me?.employer;
  const isWorker = Boolean(me?.worker);
  if (!me || !profile) return <Screen scroll={false}>{null}</Screen>;

  const status = profile.status;
  const copy = {
    PENDING: {
      icon: 'hourglass' as const,
      tone: colors.warning,
      bg: colors.warningSoft,
      title: 'Profile under review',
      text: "Thanks! Our team is verifying your details. You'll get a notification as soon as it's done.",
    },
    REJECTED: {
      icon: 'create' as const,
      tone: colors.danger,
      bg: colors.dangerSoft,
      title: 'A few changes needed',
      text: 'Please update your profile using the note below and submit again.',
    },
    SUSPENDED: {
      icon: 'ban' as const,
      tone: colors.danger,
      bg: colors.dangerSoft,
      title: 'Account suspended',
      text: 'Your account has been suspended. Please contact support if you think this is a mistake.',
    },
    APPROVED: {
      icon: 'checkmark-circle' as const,
      tone: colors.success,
      bg: colors.successSoft,
      title: "You're approved!",
      text: 'Taking you to your dashboard…',
    },
  }[status];

  const name = 'displayName' in profile ? profile.displayName : profile.fullName;

  return (
    <Screen safeTop onRefresh={refetch} refreshing={isFetching}>
      <View style={styles.hero}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.iconWrap, { backgroundColor: copy.bg }]}>
          <Ionicons name={copy.icon} size={44} color={copy.tone} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120)} style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Text variant="title" align="center">
            {copy.title}
          </Text>
          <Text color="textMuted" align="center">
            {copy.text}
          </Text>
        </Animated.View>
      </View>

      {profile.rejectionReason && status !== 'APPROVED' ? (
        <View style={[styles.reason, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
          <Text variant="overline" color="danger">
            Note from the team
          </Text>
          <Text variant="bodyMedium">{profile.rejectionReason}</Text>
        </View>
      ) : null}

      <Card style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <View style={styles.row}>
          <Avatar uri={profile.avatarUrl} name={name} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="subheading">{name}</Text>
            <Text variant="small" color="textMuted">
              {isWorker ? 'Worker' : 'Employer'} · {profile.district}
            </Text>
          </View>
          <StatusPill status={status} />
        </View>
        <InfoRow icon="time-outline" label="Submitted" value={`${formatDate(profile.submittedAt)} (${timeAgo(profile.submittedAt)})`} />
        <InfoRow icon="call-outline" label="Mobile" value={profile.phone} />
      </Card>

      <View style={{ gap: spacing.md, marginTop: spacing.xxl }}>
        {status !== 'SUSPENDED' ? (
          <Button
            title={status === 'REJECTED' ? 'Update & resubmit' : 'Edit my details'}
            icon="create-outline"
            variant={status === 'REJECTED' ? 'primary' : 'outline'}
            onPress={() => router.push(isWorker ? '/onboarding/worker' : '/onboarding/employer')}
          />
        ) : null}
        <Button title="Check status" icon="refresh" variant="soft" onPress={refetch} loading={isFetching} />
        <Button title="Sign out" variant="ghost" onPress={() => signOutEverywhere(dispatch)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.lg, marginTop: spacing.xxxl, marginBottom: spacing.md },
  iconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  reason: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, gap: 6, marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
