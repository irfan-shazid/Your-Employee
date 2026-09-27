import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AccountSection } from '@/features/account/AccountSection';
import { ProfileHero } from '@/components/layout/ProfileHero';
import { Card, IconButton, InfoRow, Text } from '@/components/ui';
import { formatDate, place } from '@/lib/format';
import { useGetMeQuery } from '@/features/account/api';
import { spacing, useTheme } from '@/theme';

export default function EmployerProfile() {
  const { colors } = useTheme();
  const { data: me, refetch, isFetching } = useGetMeQuery();
  const e = me?.employer;
  if (!e) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: spacing.huge }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#fff" colors={[colors.primary]} />}
    >
      <ProfileHero
        name={e.displayName}
        avatar={e.avatarUrl}
        verified={e.verified}
        subtitle={`${e.type === 'BUSINESS' ? 'Business' : 'Individual'} · ${e.district}`}
        right={<IconButton icon="create-outline" variant="glass" accessibilityLabel="Edit profile" onPress={() => router.push('/edit-profile')} />}
        stats={[
          { label: 'Hire credits', value: String(e.hireCredits) },
          { label: 'Verified', value: e.verified ? 'Yes' : 'No' },
          { label: 'Member since', value: formatDate(e.memberSince).split(' ').slice(1).join(' ') },
        ]}
      />
      <View style={styles.body}>
        <Card style={{ gap: spacing.xs }}>
          <Text variant="overline" color="textMuted" style={{ marginBottom: spacing.xs }}>
            Details
          </Text>
          {e.type === 'BUSINESS' ? <InfoRow icon="person-outline" label="Contact person" value={e.fullName} /> : null}
          <InfoRow icon="call-outline" label="Mobile" value={e.phone} />
          <InfoRow icon="location-outline" label="Location" value={place(e.area, e.district, e.division)} />
          {e.address ? <InfoRow icon="home-outline" label="Address" value={e.address} /> : null}
          {e.nidNumber ? <InfoRow icon="id-card-outline" label="NID" value={`•••• ${e.nidNumber.slice(-4)}`} /> : null}
          {e.tradeLicense ? <InfoRow icon="document-text-outline" label="Trade license" value={e.tradeLicense} /> : null}
        </Card>
        {e.about ? (
          <Card style={{ gap: spacing.sm }}>
            <Text variant="overline" color="textMuted">
              About
            </Text>
            <Text color="textMuted">{e.about}</Text>
          </Card>
        ) : null}
        <AccountSection />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.lg },
});
