import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ScalePressable, Text } from '@/components/ui';
import { radii, spacing, useTheme } from '@/theme';

type Props = { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string };

export function NumberStepper({ label, value, onChange, min = 0, max = 100, suffix }: Props) {
  const { colors } = useTheme();
  const btn = (icon: 'remove' | 'add', next: number, disabled: boolean) => (
    <ScalePressable
      onPress={() => onChange(next)}
      disabled={disabled}
      haptic
      scaleTo={0.9}
      accessibilityLabel={icon === 'add' ? `Increase ${label}` : `Decrease ${label}`}
      style={[styles.btn, { backgroundColor: colors.surfaceAlt, opacity: disabled ? 0.4 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </ScalePressable>
  );

  return (
    <View style={{ gap: 7 }}>
      <Text variant="smallBold">{label}</Text>
      <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {btn('remove', Math.max(min, value - 1), value <= min)}
        <Text variant="heading" style={{ flex: 1 }} align="center">
          {value}
          {suffix ? (
            <Text variant="small" color="textMuted">
              {' '}
              {suffix}
            </Text>
          ) : null}
        </Text>
        {btn('add', Math.min(max, value + 1), value >= max)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radii.md, padding: 5, gap: spacing.sm },
  btn: { width: 42, height: 42, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
});
