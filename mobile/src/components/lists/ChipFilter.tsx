import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui';
import { spacing } from '@/theme';

type Props<T extends string | undefined> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  padding?: number;
};

/** Horizontal single-choice chip row (status / type filters). */
export function ChipFilter<T extends string | undefined>({ options, value, onChange, padding = 0 }: Props<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: padding }}>
      {options.map((o) => (
        <Chip key={o.label} label={o.label} size="sm" selected={value === o.value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}
