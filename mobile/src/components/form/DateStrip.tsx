import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ScalePressable, Text } from '@/components/ui';
import { toISODate } from '@/lib/format';
import { radii, spacing, useTheme } from '@/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Horizontal picker for the next N days — quicker than a calendar for daily work. */
export function DateStrip({ label, value, onChange, days = 45 }: { label: string; value: string; onChange: (iso: string) => void; days?: number }) {
  const { colors } = useTheme();
  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      return { iso: toISODate(d), day: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DAYS[d.getDay()]!, date: d.getDate(), month: MONTHS[d.getMonth()]! };
    });
  }, [days]);

  return (
    <View style={{ gap: 7 }}>
      <Text variant="smallBold">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}>
        {dates.map((d) => {
          const active = d.iso === value;
          return (
            <ScalePressable
              key={d.iso}
              onPress={() => onChange(d.iso)}
              haptic
              scaleTo={0.93}
              accessibilityLabel={`${d.day} ${d.date} ${d.month}`}
              accessibilityState={{ selected: active }}
              style={[
                styles.cell,
                { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border },
              ]}
            >
              <Text variant="caption" style={{ color: active ? colors.onPrimary : colors.textMuted }}>
                {d.day}
              </Text>
              <Text variant="heading" style={{ color: active ? colors.onPrimary : colors.text }}>
                {d.date}
              </Text>
              <Text variant="caption" style={{ color: active ? colors.onPrimary : colors.textSubtle }}>
                {d.month}
              </Text>
            </ScalePressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { width: 62, paddingVertical: 10, borderRadius: radii.md, borderWidth: 1.5, alignItems: 'center', gap: 1 },
});
