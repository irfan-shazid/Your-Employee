import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, radii, useTheme } from '@/theme';
import { ScalePressable } from './Pressable';
import { Text } from './Text';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft' | 'dangerSoft';
type Size = 'lg' | 'md' | 'sm';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const heights: Record<Size, number> = { lg: 54, md: 46, sm: 36 };
const fontSizes: Record<Size, number> = { lg: 16, md: 15, sm: 13 };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth = true,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.text, fg: colors.bg },
    outline: { bg: 'transparent', fg: colors.text, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.primary },
    danger: { bg: colors.danger, fg: '#FFFFFF' },
    soft: { bg: colors.primarySoft, fg: colors.primary },
    dangerSoft: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const p = palette[variant];
  const inactive = disabled || loading;

  return (
    <ScalePressable
      onPress={onPress}
      disabled={inactive}
      haptic
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        {
          height: heights[size],
          backgroundColor: p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? 1.5 : 0,
          paddingHorizontal: size === 'sm' ? 14 : 20,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : 1,
          borderRadius: size === 'sm' ? radii.sm : radii.md,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={fontSizes[size] + 3} color={p.fg} /> : null}
          <Text
            style={{ color: p.fg, fontFamily: fonts.semibold, fontSize: fontSizes[size], lineHeight: fontSizes[size] + 6 }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {iconRight ? <Ionicons name={iconRight} size={fontSizes[size] + 3} color={p.fg} /> : null}
        </View>
      )}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
