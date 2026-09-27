import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { statusMeta } from '@/lib/format';
import { radii, useTheme } from '@/theme';
import { Text } from './Text';

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

type Props = {
  label: string;
  tone?: Tone;
  icon?: ComponentProps<typeof Ionicons>['name'];
  size?: 'sm' | 'md';
};

export function Pill({ label, tone = 'neutral', icon, size = 'sm' }: Props) {
  const { colors } = useTheme();
  const map: Record<Tone, { bg: string; fg: string }> = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
    neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
    accent: { bg: colors.accentSoft, fg: colors.accent },
  };
  const { bg, fg } = map[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg, paddingVertical: size === 'md' ? 6 : 3, paddingHorizontal: size === 'md' ? 12 : 9 }]}>
      {icon ? <Ionicons name={icon} size={size === 'md' ? 14 : 12} color={fg} /> : null}
      <Text variant="caption" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Coloured pill for any backend status value (job, hire, application, payment, approval). */
export function StatusPill({ status, size }: { status: string; size?: 'sm' | 'md' }) {
  const meta = statusMeta(status);
  return <Pill label={meta.label} tone={meta.tone} icon={meta.icon} size={size} />;
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.pill, alignSelf: 'flex-start' },
});
