import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Button, Chip, SelectField, Sheet, Text } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { spacing, useTheme } from '@/theme';

type SortOption<S extends string> = { value: S; label: string };

type Props<S extends string> = {
  visible: boolean;
  onClose: () => void;
  district?: string;
  sort: S;
  sortOptions: readonly SortOption<S>[];
  urgent?: boolean;
  showUrgent?: boolean;
  onApply: (v: { district?: string; sort: S; urgent?: boolean }) => void;
  onReset: () => void;
};

export function FilterSheet<S extends string>({ visible, onClose, district, sort, sortOptions, urgent, showUrgent, onApply, onReset }: Props<S>) {
  const { colors } = useTheme();
  const { allDistrictOptions } = useMeta();
  const [draft, setDraft] = useState({ district, sort, urgent });

  // Re-sync draft each time the sheet opens.
  const [lastVisible, setLastVisible] = useState(visible);
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) setDraft({ district, sort, urgent });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Filters">
      <View style={{ gap: spacing.xl }}>
        <SelectField
          label="District"
          placeholder="All of Bangladesh"
          icon="location-outline"
          options={[{ value: '', label: 'All districts' }, ...allDistrictOptions]}
          value={draft.district ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, district: v || undefined }))}
          searchable
        />
        <View style={{ gap: spacing.sm }}>
          <Text variant="smallBold">Sort by</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {sortOptions.map((o) => (
              <Chip key={o.value} label={o.label} selected={draft.sort === o.value} onPress={() => setDraft((d) => ({ ...d, sort: o.value }))} />
            ))}
          </View>
        </View>
        {showUrgent ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text variant="bodySemibold">Urgent jobs only</Text>
              <Text variant="caption" color="textMuted">
                Employers who need someone right away
              </Text>
            </View>
            <Switch
              value={Boolean(draft.urgent)}
              onValueChange={(v) => setDraft((d) => ({ ...d, urgent: v }))}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button
            title="Reset"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => {
              onReset();
              onClose();
            }}
          />
          <Button
            title="Apply"
            style={{ flex: 2 }}
            onPress={() => {
              onApply(draft);
              onClose();
            }}
          />
        </View>
      </View>
    </Sheet>
  );
}
