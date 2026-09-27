import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, spacing, useTheme } from '@/theme';
import { ScalePressable } from './Pressable';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  /** Fires as soon as a finger touches the card — used to prefetch the next screen's data. */
  onPressIn?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Card({ children, onPress, onPressIn, padded = true, style, accessibilityLabel }: Props) {
  const { colors, shadow } = useTheme();
  const base = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: shadow.card, padding: padded ? spacing.lg : 0 },
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <ScalePressable
      onPress={onPress}
      onPressIn={onPressIn}
      scaleTo={0.985}
      style={base}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
