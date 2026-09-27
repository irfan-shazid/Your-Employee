import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { taka } from '@/lib/format';
import { radii, spacing, useTheme } from '@/theme';

/** Nudges an approved worker without an active plan to subscribe. */
export function SubscriptionBanner({ price }: { price: number }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push('/subscription')}
      accessibilityRole="button"
      style={[styles.banner, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
    >
      <View style={[styles.icon, { backgroundColor: colors.accent }]}>
        <Ionicons name="flash" size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodySemibold">Activate your plan to apply</Text>
        <Text variant="small" color="textMuted">
          {taka(price)}/month · get seen by employers
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
