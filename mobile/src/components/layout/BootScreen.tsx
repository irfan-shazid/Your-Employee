import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useGetMeQuery } from '@/features/account/api';
import { useAppSelector } from '@/store/hooks';
import { fonts, spacing, useTheme } from '@/theme';

/** Branded loading screen (sits under the native splash) with an offline retry state. */
export function BootScreen({ offline = false }: { offline?: boolean }) {
  const { colors } = useTheme();
  const status = useAppSelector((s) => s.auth.status);
  const me = useGetMeQuery(undefined, { skip: status !== 'signedIn' });

  return (
    <LinearGradient colors={[colors.heroFrom, colors.heroTo]} style={styles.root}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>YE</Text>
      </View>
      {offline ? (
        <View style={{ gap: spacing.md, alignItems: 'center', paddingHorizontal: spacing.xxl }}>
          <Text variant="heading" style={{ color: '#fff' }} align="center">
            You’re offline
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)' }} align="center">
            We couldn’t reach the server. Check your connection and try again.
          </Text>
          <Button title="Try again" variant="secondary" onPress={() => me.refetch()} loading={me.isFetching} fullWidth={false} />
        </View>
      ) : (
        <ActivityIndicator color="#fff" />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxl },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 32, lineHeight: 38, fontFamily: fonts.extrabold },
});
