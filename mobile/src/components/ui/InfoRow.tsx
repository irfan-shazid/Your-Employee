import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing, useTheme } from '@/theme';
import { Text } from './Text';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Icon + label + value row used in detail screens. */
export function InfoRow({ icon, label, value, right }: { icon: IconName; label: string; value?: string | null; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
        <Text variant="bodyMedium">{value || '—'}</Text>
      </View>
      {right}
    </View>
  );
}

/** Tappable settings-style row. */
export function MenuRow({
  icon,
  label,
  hint,
  onPress,
  danger,
  right,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.menu, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
    >
      <View style={[styles.icon, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color={danger ? 'danger' : 'text'}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null)}
    </Pressable>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text variant="smallBold" color="primary">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  icon: { width: 38, height: 38, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  menu: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 11, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
});
