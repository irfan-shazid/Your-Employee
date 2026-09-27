import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DateStrip } from '@/components/form/DateStrip';
import { LocationFields } from '@/components/form/LocationFields';
import { AppHeader, Avatar, Button, Card, Chip, Input, Rating, Screen, SelectField, Text } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { taka, tomorrowISO, wageTypeLabel } from '@/lib/format';
import { collectErrors, validators } from '@/lib/validation';
import { fieldErrors } from '@/store/api';
import { useGetMeQuery } from '@/features/account/api';
import { useCreateDirectHireMutation } from '@/features/hires/api';
import { useHireFlow } from '@/features/hires/useHireFlow';
import { useGetWorkerQuery } from '@/features/workers/api';
import { radii, spacing, useTheme } from '@/theme';
import type { WageType } from '@/types/api';

/** Direct hire: send an offer to a worker found in the directory (no job post). */
export default function NewDirectHire() {
  const { workerId } = useLocalSearchParams<{ workerId: string }>();
  const { colors } = useTheme();
  const { data: workerData } = useGetWorkerQuery(workerId);
  const { data: me } = useGetMeQuery();
  const { pricing, features } = useMeta();
  const [createHire, { isLoading }] = useCreateDirectHireMutation();
  const { hireAndPay, paying } = useHireFlow();
  const worker = workerData?.worker;
  const employer = me?.employer;
  const credits = employer?.hireCredits ?? 0;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(() => ({
    categoryId: '',
    title: '',
    description: '',
    wageAmount: '',
    wageType: 'DAILY' as WageType,
    startDate: tomorrowISO(),
    location: {
      division: employer?.division ?? '',
      district: employer?.district ?? '',
      area: employer?.area ?? '',
      address: employer?.address ?? '',
    },
  }));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Pre-fill with the worker's main category and asking wage once loaded.
  const [prefilled, setPrefilled] = useState(false);
  if (worker && !prefilled) {
    setPrefilled(true);
    setForm((f) => ({
      ...f,
      categoryId: f.categoryId || worker.categories[0]?.id || '',
      wageAmount: f.wageAmount || String(worker.expectedWage),
      wageType: worker.wageType,
    }));
  }

  const categoryOptions = (worker?.categories ?? []).map((c) => ({ value: c.id, label: c.name, sublabel: c.nameBn, icon: c.icon as never }));

  const submit = async () => {
    const found = collectErrors({
      categoryId: validators.required(form.categoryId, 'Category'),
      title: form.title.trim().length < 5 ? 'Describe the work in a short title' : undefined,
      wageAmount: validators.number(form.wageAmount, { min: 50, max: 500000, label: 'Wage' }),
      division: validators.required(form.location.division, 'Division'),
      district: validators.required(form.location.district, 'District'),
      area: form.location.area.trim().length >= 2 ? undefined : 'Area is required',
    });
    setErrors(found ?? {});
    if (found || !worker) return;

    const offer = {
      workerId: worker.id,
      categoryId: form.categoryId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      wageAmount: Number(form.wageAmount),
      wageType: form.wageType,
      startDate: form.startDate,
      division: form.location.division,
      district: form.location.district,
      area: form.location.area.trim(),
      address: form.location.address.trim() || null,
      useCredit: true,
    };
    const firstName = worker.fullName.split(' ')[0];
    const result = await hireAndPay(() => createHire(offer).unwrap(), `Offer sent to ${firstName} using 1 free credit.`, { replace: true });
    if (!result.ok) setErrors(fieldErrors(result.error));
  };

  return (
    <Screen
      keyboard
      header={<AppHeader title="Send a job offer" />}
      footer={
        <Button
          title={credits > 0 ? 'Send offer · 1 free credit' : `Send offer · ${taka(pricing.hire)}`}
          icon="paper-plane"
          onPress={submit}
          loading={isLoading || paying}
          disabled={!worker || (credits === 0 && !features.payments)}
        />
      }
    >
      <View style={{ gap: spacing.lg }}>
        {worker ? (
          <Card style={styles.worker}>
            <Avatar uri={worker.avatarUrl} name={worker.fullName} size={48} verified={worker.verified} />
            <View style={{ flex: 1 }}>
              <Text variant="subheading">{worker.fullName}</Text>
              <Rating value={worker.ratingAvg} count={worker.ratingCount} />
            </View>
          </Card>
        ) : null}

        <SelectField label="Type of work" options={categoryOptions} value={form.categoryId || null} onChange={(v) => set('categoryId', v)} error={errors.categoryId} />
        <Input label="What do you need done?" value={form.title} onChangeText={(v) => set('title', v)} error={errors.title} placeholder="e.g. Fix kitchen wiring" maxLength={90} />
        <Input label="Details" optional multiline value={form.description} onChangeText={(v) => set('description', v)} placeholder="Working hours, tools, meals, anything the worker should know" maxLength={1000} />

        <View style={styles.chips}>
          {(Object.keys(wageTypeLabel) as WageType[]).map((w) => (
            <Chip key={w} label={wageTypeLabel[w]} selected={form.wageType === w} onPress={() => set('wageType', w)} size="sm" />
          ))}
        </View>
        <Input label="Pay offered" prefix="৳" value={form.wageAmount} onChangeText={(v) => set('wageAmount', v.replace(/\D/g, ''))} error={errors.wageAmount} keyboardType="number-pad" maxLength={6} />
        <DateStrip label="Start date" value={form.startDate} onChange={(v) => set('startDate', v)} days={30} />
        <LocationFields value={form.location} onChange={(v) => set('location', v)} errors={errors} areaLabel="Work location (area)" />

        <View style={[styles.note, { backgroundColor: colors.infoSoft }]}>
          <Text variant="small" style={{ color: colors.info }}>
            The worker can accept or decline. If they decline, you get a free hire credit back — no money lost.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  worker: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { padding: spacing.md, borderRadius: radii.md },
});
