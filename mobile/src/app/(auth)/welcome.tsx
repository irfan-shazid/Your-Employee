import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoogleButton } from '@/features/auth/GoogleButton';
import { Button, Text } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { fonts, radii, spacing, useTheme } from '@/theme';

const tiles = [
  { icon: 'hammer', label: 'Labor' },
  { icon: 'flash', label: 'Electric' },
  { icon: 'water', label: 'Plumbing' },
  { icon: 'color-palette', label: 'Painting' },
  { icon: 'car', label: 'Driving' },
  { icon: 'restaurant', label: 'Cooking' },
] as const;

export default function Welcome() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { features } = useMeta();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.brandRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>YE</Text>
          </View>
          <Text style={styles.brand}>Your Employee</Text>
        </Animated.View>

        <View style={styles.grid}>
          {tiles.map((t, i) => (
            <Animated.View key={t.label} entering={FadeInUp.delay(120 + i * 70).springify().damping(16)} style={styles.tile}>
              <Ionicons name={t.icon} size={24} color="#fff" />
              <Text style={styles.tileLabel}>{t.label}</Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInUp.delay(550).duration(500)}>
          <Text style={styles.headline}>Find work.{'\n'}Hire trusted hands.</Text>
          <Text style={styles.sub}>কাজ খুঁজুন, বিশ্বস্ত কর্মী নিন — verified workers & employers across Bangladesh.</Text>
        </Animated.View>
      </LinearGradient>

      <Animated.View entering={FadeInUp.delay(700).duration(450)} style={[styles.actions, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Button title="Create an account" iconRight="arrow-forward" onPress={() => router.push('/sign-up')} />
        {features.googleSignIn ? <GoogleButton /> : null}
        <Button title="I already have an account" variant="ghost" onPress={() => router.push('/sign-in')} />
        <View style={styles.trust}>
          <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
          <Text variant="caption" color="textMuted">
            Every profile is verified by our team
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 17, lineHeight: 22 },
  brand: { color: '#fff', fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center', marginVertical: spacing.xl },
  tile: {
    width: '30%',
    aspectRatio: 1.1,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tileLabel: { color: 'rgba(255,255,255,0.92)', fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  headline: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 39, letterSpacing: -0.6 },
  sub: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  actions: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, gap: spacing.md },
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
