import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';

import { radii, useTheme } from '@/theme';
import { ScalePressable } from './Pressable';
import { Text } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  size?: 'md' | 'sm';
};

export function Chip({ label, selected, onPress, icon, size = 'md' }: Props) {
  const { colors } = useTheme();
  return (
    <ScalePressable
      onPress={onPress}
      scaleTo={0.94}
      haptic
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          height: size === 'sm' ? 32 : 38,
          paddingHorizontal: size === 'sm' ? 12 : 14,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={size === 'sm' ? 14 : 16} color={selected ? colors.onPrimary : colors.textMuted} /> : null}
      <Text variant={size === 'sm' ? 'caption' : 'smallBold'} style={{ color: selected ? colors.onPrimary : colors.text }} numberOfLines={1}>
        {label}
      </Text>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
