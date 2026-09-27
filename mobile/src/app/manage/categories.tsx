import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AppHeader, Button, Card, ErrorState, IconButton, Input, Screen, Sheet, SkeletonList, Text } from '@/components/ui';
import { errorMessage } from '@/store/api';
import { useGetAdminCategoriesQuery, useSaveCategoryMutation } from '@/features/admin/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import { radii, spacing, useTheme } from '@/theme';
import type { AdminCategory } from '@/types/api';

const empty = { name: '', nameBn: '', icon: 'hammer', sortOrder: '0', isActive: true };

export default function Categories() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAdminCategoriesQuery();
  const [save, { isLoading: saving }] = useSaveCategoryMutation();
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [form, setForm] = useState(empty);

  const open = (c: AdminCategory | 'new') => {
    setEditing(c);
    setForm(c === 'new' ? { ...empty, sortOrder: String(data?.items.length ?? 0) } : { name: c.name, nameBn: c.nameBn, icon: c.icon, sortOrder: String(c.sortOrder), isActive: c.isActive });
  };

  const submit = async () => {
    try {
      await save({
        id: editing && editing !== 'new' ? editing.id : undefined,
        name: form.name.trim(),
        nameBn: form.nameBn.trim(),
        icon: form.icon.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      }).unwrap();
      setEditing(null);
      dispatch(toast('success', 'Category saved'));
    } catch (err) {
      dispatch(toast('error', "Couldn't save", errorMessage(err)));
    }
  };

  return (
    <Screen
      header={<AppHeader title="Categories" right={<IconButton icon="add" variant="primary" accessibilityLabel="Add category" onPress={() => open('new')} />} />}
      onRefresh={refetch}
      refreshing={isFetching}
    >
      {isLoading ? (
        <SkeletonList count={4} />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {data?.items.map((c) => (
            <Card key={c.id} onPress={() => open(c)} style={[styles.row, !c.isActive && { opacity: 0.5 }]}>
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={c.icon as never} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodySemibold">{c.name}</Text>
                <Text variant="caption" color="textMuted">
                  {c.nameBn} · {c._count.workers} workers · {c._count.jobs} jobs
                </Text>
              </View>
              {!c.isActive ? (
                <Text variant="caption" color="textSubtle">
                  Hidden
                </Text>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
            </Card>
          ))}
        </View>
      )}

      <Sheet visible={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'New category' : 'Edit category'}>
        <View style={{ gap: spacing.lg }}>
          <Input label="Name (English)" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Boat Worker" />
          <Input label="Name (বাংলা)" value={form.nameBn} onChangeText={(v) => setForm((f) => ({ ...f, nameBn: v }))} placeholder="যেমন: নৌকা শ্রমিক" />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 2 }}>
              <Input
                label="Icon"
                value={form.icon}
                onChangeText={(v) => setForm((f) => ({ ...f, icon: v.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                autoCapitalize="none"
                hint="Any Ionicons name"
                right={<Ionicons name={form.icon as never} size={20} color={colors.primary} />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Order" value={form.sortOrder} onChangeText={(v) => setForm((f) => ({ ...f, sortOrder: v.replace(/\D/g, '') }))} keyboardType="number-pad" />
            </View>
          </View>
          <View style={styles.row}>
            <Text variant="bodySemibold" style={{ flex: 1 }}>
              Visible in the app
            </Text>
            <Switch value={form.isActive} onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
          </View>
          <Button title="Save" onPress={submit} loading={saving} disabled={form.name.trim().length < 2 || !form.nameBn.trim()} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
});
