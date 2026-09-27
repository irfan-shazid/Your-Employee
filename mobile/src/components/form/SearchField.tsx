import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { Input } from '@/components/ui';
import { useTheme } from '@/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  /** Number of active filters; shows the filter button highlighted when > 0. */
  activeFilters?: number;
  onOpenFilters?: () => void;
};

/** Search box with an optional filter button, used by the job feed and worker directory. */
export function SearchField({ value, onChangeText, placeholder, activeFilters = 0, onOpenFilters }: Props) {
  const { colors } = useTheme();
  return (
    <Input
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      icon="search"
      returnKeyType="search"
      autoCorrect={false}
      right={
        onOpenFilters ? (
          <Pressable
            onPress={onOpenFilters}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={activeFilters ? `Filters, ${activeFilters} active` : 'Filters'}
            style={[styles.filter, { backgroundColor: activeFilters ? colors.primary : colors.surfaceAlt }]}
          >
            <Ionicons name="options-outline" size={18} color={activeFilters ? colors.onPrimary : colors.text} />
          </Pressable>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  filter: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
