import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { radii, spacing, useTheme } from '@/theme';

type Props = { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle> };

export function Skeleton({ width = '100%', height = 14, radius = radii.xs, style }: Props) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.set(withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton }, animated, style]} />;
}

/** Placeholder shaped like a list card, shown while the first page loads. */
export function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Skeleton width={46} height={46} radius={14} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="70%" height={15} />
          <Skeleton width="45%" height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={12} />
      <View style={styles.row}>
        <Skeleton width={80} height={24} radius={12} />
        <Skeleton width={90} height={24} radius={12} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
