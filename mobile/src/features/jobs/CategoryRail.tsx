import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet } from 'react-native';

import { ScalePressable, Text } from '@/components/ui';
import { radii, spacing, useTheme } from '@/theme';
import type { Category } from '@/types/api';

/** Horizontal category filter with an "All" option. */
export function CategoryRail({ categories, value, onChange }: { categories: Category[]; value?: string; onChange: (id?: string) => void }) {
  const { colors } = useTheme();
  const items: { id?: string; name: string; icon: string }[] = [{ id: undefined, name: 'All', icon: 'apps' }, ...categories];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((c) => {
        const active = c.id === value;
        return (
          <ScalePressable
            key={c.id ?? 'all'}
            onPress={() => onChange(c.id)}
            haptic
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.item, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}
          >
            <Ionicons name={c.icon as never} size={16} color={active ? colors.onPrimary : colors.primary} />
            <Text variant="smallBold" style={{ color: active ? colors.onPrimary : colors.text }} numberOfLines={1}>
              {c.name}
            </Text>
          </ScalePressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1 },
});
