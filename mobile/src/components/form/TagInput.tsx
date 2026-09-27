import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Input, Text } from '@/components/ui';
import { capitalize } from '@/lib/format';
import { radii, spacing, useTheme } from '@/theme';

type Props = { label: string; value: string[]; onChange: (v: string[]) => void; max?: number; placeholder?: string; hint?: string };

export function TagInput({ label, value, onChange, max = 15, placeholder, hint }: Props) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');

  const add = () => {
    const tags = draft
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && t.length <= 30);
    const next = [...value];
    for (const t of tags) if (!next.some((x) => x.toLowerCase() === t.toLowerCase()) && next.length < max) next.push(t);
    onChange(next);
    setDraft('');
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Input
        label={label}
        value={draft}
        onChangeText={setDraft}
        placeholder={placeholder}
        hint={hint}
        optional
        returnKeyType="done"
        onSubmitEditing={add}
        submitBehavior="submit"
        right={
          draft.trim() ? (
            <Pressable onPress={add} hitSlop={8} accessibilityLabel="Add skill">
              <Ionicons name="add-circle" size={26} color={colors.primary} />
            </Pressable>
          ) : null
        }
      />
      {value.length ? (
        <View style={styles.wrap}>
          {value.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.primarySoft }]}>
              <Text variant="smallBold" color="primary">
                {capitalize(tag)}
              </Text>
              <Pressable onPress={() => onChange(value.filter((t) => t !== tag))} hitSlop={8} accessibilityLabel={`Remove ${tag}`}>
                <Ionicons name="close" size={15} color={colors.primary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 12, paddingRight: 8, borderRadius: radii.pill },
});
