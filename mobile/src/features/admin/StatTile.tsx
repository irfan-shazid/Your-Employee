import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { radii, spacing, useTheme } from '@/theme';

type Props = {
  label: string;
  value: string | number;
  icon: ComponentProps<typeof Ionicons>['name'];
  hint?: string;
  /** Status tint for the icon only — values always use text colours. */
  tone?: 'primary' | 'warning' | 'info' | 'accent';
  onPress?: () => void;
};

/** KPI stat tile: label, value, optional hint. */
export function StatTile({ label, value, icon, hint, tone = 'primary', onPress }: Props) {
  const { colors } = useTheme();
  const tint = { primary: [colors.primarySoft, colors.primary], warning: [colors.warningSoft, colors.warning], info: [colors.infoSoft, colors.info], accent: [colors.accentSoft, colors.accent] }[tone];

  return (
    <Card onPress={onPress} style={styles.tile} accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.icon, { backgroundColor: tint[0] }]}>
        <Ionicons name={icon} size={18} color={tint[1]} />
      </View>
      <Text variant="title">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</Text>
      <Text variant="smallMedium" color="textMuted" numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text variant="caption" color="textSubtle" numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, gap: 2, minWidth: '45%' },
  icon: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
});
