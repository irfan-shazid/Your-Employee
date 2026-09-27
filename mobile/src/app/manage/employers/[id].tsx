import { useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { DecisionBar } from '@/features/admin/DecisionBar';
import { AppHeader, Avatar, Button, Card, InfoRow, QueryFallback, Screen, StatusPill, Text } from '@/components/ui';
import { formatDate, timeAgo, place } from '@/lib/format';
import { errorMessage } from '@/store/api';
import { useGetAdminEmployerQuery } from '@/features/admin/api';
import { radii, spacing, useTheme } from '@/theme';

export default function ReviewEmployer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data, isError, error, refetch, isFetching } = useGetAdminEmployerQuery(id);

  if (!data) return <QueryFallback title="Review employer" error={isError ? errorMessage(error) : null} onRetry={refetch} />;
  const e = data.employer;

  return (
    <Screen
      header={<AppHeader title="Review employer" />}
      footer={<DecisionBar kind="employers" id={e.id} status={e.status} name={e.displayName} />}
      onRefresh={refetch}
      refreshing={isFetching}
    >
      <View style={{ gap: spacing.lg }}>
        <View style={styles.top}>
          <Avatar uri={e.avatarUrl} name={e.displayName} size={80} />
          <Text variant="title" align="center">
            {e.displayName}
          </Text>
          <Text variant="small" color="textMuted">
            {e.email} · submitted {timeAgo(e.submittedAt)}
          </Text>
          <StatusPill status={e.status} size="md" />
        </View>

        {e.rejectionReason ? (
          <View style={[styles.reason, { backgroundColor: colors.dangerSoft }]}>
            <Text variant="caption" color="danger">
              Last note: {e.rejectionReason}
            </Text>
          </View>
        ) : null}

        <Card style={{ gap: spacing.xs }}>
          <Text variant="overline" color="textMuted" style={{ marginBottom: spacing.xs }}>
            Identity check
          </Text>
          <InfoRow icon="briefcase-outline" label="Type" value={e.type === 'BUSINESS' ? 'Business' : 'Individual / household'} />
          {e.companyName ? <InfoRow icon="business-outline" label="Business name" value={e.companyName} /> : null}
          <InfoRow icon="person-outline" label={e.type === 'BUSINESS' ? 'Contact person' : 'Full name'} value={e.fullName} />
          <InfoRow icon="id-card-outline" label="NID number" value={e.nidNumber} />
          <InfoRow icon="document-text-outline" label="Trade license" value={e.tradeLicense} />
          <InfoRow
            icon="call-outline"
            label="Mobile"
            value={e.phone}
            right={<Button title="Call" size="sm" variant="soft" fullWidth={false} onPress={() => Linking.openURL(`tel:${e.phone}`)} />}
          />
          <InfoRow icon="location-outline" label="Location" value={place(e.area, e.district, e.division)} />
          {e.address ? <InfoRow icon="home-outline" label="Address" value={e.address} /> : null}
        </Card>

        {e.about ? (
          <Card style={{ gap: spacing.sm }}>
            <Text variant="overline" color="textMuted">
              About
            </Text>
            <Text color="textMuted">{e.about}</Text>
          </Card>
        ) : null}

        <Card style={{ gap: spacing.xs }}>
          <Text variant="overline" color="textMuted" style={{ marginBottom: spacing.xs }}>
            Activity
          </Text>
          <InfoRow icon="megaphone-outline" label="Jobs posted" value={String(data.counts.jobs)} />
          <InfoRow icon="people-outline" label="Hires" value={String(data.counts.hires)} />
          <InfoRow icon="gift-outline" label="Hire credits" value={String(e.hireCredits)} />
          <InfoRow icon="calendar-outline" label="Joined" value={formatDate(e.joinedAt)} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: spacing.xs },
  reason: { padding: spacing.md, borderRadius: radii.md },
});
