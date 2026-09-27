import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Text } from '@/components/ui';
import { fonts, radii, spacing, useTheme } from '@/theme';

type Stat = { label: string; value: string };

/** Gradient header with avatar, name and a stats strip — used on profile tabs. */
export function ProfileHero({ name, avatar, subtitle, verified, stats, right }: { name: string; avatar?: string | null; subtitle?: string; verified?: boolean; stats?: Stat[]; right?: ReactNode }) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View>
      <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        {right ? <View style={[styles.right, { top: insets.top + spacing.sm }]}>{right}</View> : null}
        <View style={[styles.avatarRing]}>
          <Avatar uri={avatar} name={name} size={84} verified={verified} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </LinearGradient>
      {stats?.length ? (
        <View style={[styles.stats, { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: shadow.card }]}>
          {stats.map((s, i) => (
            <View key={s.label} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
              <Text variant="heading">{s.value}</Text>
              <Text variant="caption" color="textMuted">
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 52, paddingHorizontal: spacing.xl, gap: 6 },
  right: { position: 'absolute', right: spacing.lg },
  avatarRing: { padding: 4, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: spacing.sm },
  name: { color: '#fff', fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  sub: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  stats: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginTop: -34,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
});
