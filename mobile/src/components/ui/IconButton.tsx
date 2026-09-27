import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, useTheme } from '@/theme';
import { ScalePressable } from './Pressable';
import { Text } from './Text';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  size?: number;
  badge?: number;
  variant?: 'surface' | 'ghost' | 'glass' | 'primary';
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, onPress, size = 42, badge, variant = 'surface', accessibilityLabel, style }: Props) {
  const { colors } = useTheme();
  const bg = {
    surface: colors.surface,
    ghost: 'transparent',
    glass: 'rgba(255,255,255,0.18)',
    primary: colors.primary,
  }[variant];
  const fg = variant === 'glass' ? '#FFFFFF' : variant === 'primary' ? colors.onPrimary : colors.text;

  return (
    <ScalePressable
      onPress={onPress}
      scaleTo={0.9}
      haptic
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: variant === 'surface' ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={fg} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: variant === 'glass' ? 'transparent' : colors.surface }]}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 10, lineHeight: 13 },
});
