import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { useMemo, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing, useTheme } from '@/theme';
import { Input } from './Input';
import { Sheet } from './Sheet';
import { Text } from './Text';

export type Option<T extends string = string> = {
  value: T;
  label: string;
  sublabel?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

type Props<T extends string> = {
  label?: string;
  placeholder?: string;
  value?: T | null;
  options: Option<T>[];
  onChange: (value: T) => void;
  error?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  searchable?: boolean;
  disabled?: boolean;
  sheetTitle?: string;
};

export function SelectField<T extends string>({
  label,
  placeholder = 'Select',
  value,
  options,
  onChange,
  error,
  icon,
  searchable,
  disabled,
  sheetTitle,
}: Props<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ gap: 7 }}>
      {label ? <Text variant="smallBold">{label}</Text> : null}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? placeholder}: ${selected?.label ?? 'not selected'}`}
        style={[
          styles.field,
          { borderColor: error ? colors.danger : colors.border, backgroundColor: colors.surface, opacity: disabled ? 0.5 : 1 },
        ]}
      >
        {icon || selected?.icon ? <Ionicons name={selected?.icon ?? icon!} size={19} color={colors.textSubtle} /> : null}
        <Text variant="bodyMedium" color={selected ? 'text' : 'textSubtle'} style={{ flex: 1 }} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSubtle} />
      </Pressable>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
      <OptionSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label ?? placeholder}
        options={options}
        value={value}
        searchable={searchable ?? options.length > 8}
        onSelect={(v) => {
          onChange(v);
          setOpen(false);
        }}
      />
    </View>
  );
}

type SheetProps<T extends string> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: Option<T>[];
  value?: T | null;
  searchable?: boolean;
  onSelect: (value: T) => void;
};

export function OptionSheet<T extends string>({ visible, onClose, title, options, value, searchable, onSelect }: SheetProps<T>) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} tall={options.length > 8}>
      {searchable ? (
        <View style={{ marginBottom: spacing.md }}>
          <Input value={query} onChangeText={setQuery} placeholder="Search…" icon="search" autoCorrect={false} />
        </View>
      ) : null}
      <View style={{ flexGrow: 1, flexShrink: 1, minHeight: Math.min(filtered.length, 6) * 56 }}>
        <FlashList
          data={filtered}
          keyExtractor={(o) => o.value}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = item.value === value;
            return (
              <Pressable
                onPress={() => onSelect(item.value)}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: active ? colors.primarySoft : pressed ? colors.surfaceAlt : 'transparent' },
                ]}
              >
                {item.icon ? (
                  <View style={[styles.optionIcon, { backgroundColor: active ? colors.surface : colors.surfaceAlt }]}>
                    <Ionicons name={item.icon} size={18} color={colors.primary} />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" color={active ? 'primary' : 'text'}>
                    {item.label}
                  </Text>
                  {item.sublabel ? (
                    <Text variant="caption" color="textMuted">
                      {item.sublabel}
                    </Text>
                  ) : null}
                </View>
                {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text color="textMuted" align="center" style={{ padding: spacing.xl }}>
              Nothing matches “{query}”
            </Text>
          }
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md + 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    minHeight: 52,
  },
  optionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
