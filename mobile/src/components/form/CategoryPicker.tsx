import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ScalePressable, Text } from '@/components/ui';
import type { Category } from '@/types/api';
import { radii, spacing, useTheme } from '@/theme';

type Props = {
  categories: Category[];
  selected: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  error?: string;
};

/** Grid of work categories (English + Bangla). Multi-select up to `max`. */
export function CategoryPicker({ categories, selected, onChange, max = 5, error }: Props) {
  const { colors } = useTheme();

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < max) onChange([...selected, id]);
    else if (max === 1) onChange([id]);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.grid}>
        {categories.map((c) => {
          const active = selected.includes(c.id);
          return (
            <ScalePressable
              key={c.id}
              onPress={() => toggle(c.id)}
              haptic
              scaleTo={0.95}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={c.name}
              style={[
                styles.tile,
                {
                  backgroundColor: active ? colors.primarySoft : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: active ? colors.primary : colors.surfaceAlt }]}>
                <Ionicons name={c.icon as never} size={20} color={active ? colors.onPrimary : colors.textMuted} />
              </View>
              <Text variant="smallBold" numberOfLines={2} align="center" color={active ? 'primary' : 'text'}>
                {c.name}
              </Text>
              <Text variant="caption" color="textMuted" numberOfLines={1} align="center">
                {c.nameBn}
              </Text>
              {active ? (
                <View style={styles.check}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                </View>
              ) : null}
            </ScalePressable>
          );
        })}
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : max > 1 ? (
        <Text variant="caption" color="textMuted">
          {selected.length}/{max} selected
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31.8%',
    minHeight: 118,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  check: { position: 'absolute', top: 6, right: 6 },
});
