import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { DateStrip } from '@/components/form/DateStrip';
import { LocationFields } from '@/components/form/LocationFields';
import { NumberStepper } from '@/components/form/NumberStepper';
import { AppHeader, Button, Card, Chip, Input, Screen, SelectField, Text } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { usePayment } from '@/features/payments/usePayment';
import { taka, tomorrowISO, wageTypeLabel } from '@/lib/format';
import { collectErrors, validators } from '@/lib/validation';
import { errorMessage, fieldErrors } from '@/store/api';
import { useGetMeQuery } from '@/features/account/api';
import { useCreateJobMutation } from '@/features/jobs/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import { radii, spacing, useTheme } from '@/theme';
import type { WageType } from '@/types/api';

export default function PostJob() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { categoryOptions, pricing, features } = useMeta();
  const { data: me } = useGetMeQuery();
  const [createJob, { isLoading: creating }] = useCreateJobMutation();
  const { pay, paying } = usePayment();
  const employer = me?.employer;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(() => ({
    categoryId: '',
    title: '',
    description: '',
    wageAmount: '',
    wageType: 'DAILY' as WageType,
    workersNeeded: 1,
    startDate: tomorrowISO(),
    durationDays: 1,
    location: {
      division: employer?.division ?? '',
      district: employer?.district ?? '',
      area: employer?.area ?? '',
      address: employer?.address ?? '',
    },
    isUrgent: false,
  }));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    const found = collectErrors({
      categoryId: validators.required(form.categoryId, 'Category'),
      title: form.title.trim().length < 5 ? 'Give the job a clear title (at least 5 characters)' : undefined,
      description: form.description.trim().length < 20 ? 'Describe the work in at least 20 characters' : undefined,
      wageAmount: validators.number(form.wageAmount, { min: 50, max: 500000, label: 'Wage' }),
      division: validators.required(form.location.division, 'Division'),
      district: validators.required(form.location.district, 'District'),
      area: form.location.area.trim().length >= 2 ? undefined : 'Area is required',
    });
    setErrors(found ?? {});
    if (found) {
      dispatch(toast('error', 'Please complete the highlighted fields'));
      return;
    }
    try {
      const { job } = await createJob({
        categoryId: form.categoryId,
        title: form.title.trim(),
        description: form.description.trim(),
        wageAmount: Number(form.wageAmount),
        wageType: form.wageType,
        workersNeeded: form.workersNeeded,
        startDate: form.startDate,
        durationDays: form.durationDays,
        division: form.location.division,
        district: form.location.district,
        area: form.location.area.trim(),
        address: form.location.address.trim() || null,
        isUrgent: form.isUrgent,
      }).unwrap();
      await pay('JOB_POST', job.id);
      router.replace(`/jobs/${job.id}`);
    } catch (err) {
      setErrors(fieldErrors(err));
      dispatch(toast('error', "Couldn't post the job", errorMessage(err)));
    }
  };

  return (
    <Screen
      keyboard
      header={<AppHeader title="Post a job" />}
      footer={
        <>
          <Button title={`Continue to payment · ${taka(pricing.jobPost)}`} icon="card-outline" onPress={submit} loading={creating || paying} disabled={!features.payments} />
          {!features.payments ? (
            <Text variant="caption" color="textSubtle" align="center">
              Payments are not configured on the server yet
            </Text>
          ) : null}
        </>
      }
    >
      <View style={{ gap: spacing.lg }}>
        <SelectField
          label="Type of work"
          placeholder="Choose a category"
          icon="grid-outline"
          options={categoryOptions}
          value={form.categoryId || null}
          onChange={(v) => set('categoryId', v)}
          error={errors.categoryId}
          searchable
        />
        <Input label="Job title" value={form.title} onChangeText={(v) => set('title', v)} error={errors.title} placeholder="e.g. Need 2 masons for boundary wall" maxLength={90} />
        <Input
          label="Description"
          multiline
          value={form.description}
          onChangeText={(v) => set('description', v)}
          error={errors.description}
          placeholder="What needs to be done, working hours, tools or materials provided, meals…"
          maxLength={2000}
        />

        <Text variant="heading" style={styles.section}>
          Pay
        </Text>
        <View style={styles.chips}>
          {(Object.keys(wageTypeLabel) as WageType[]).map((w) => (
            <Chip key={w} label={wageTypeLabel[w]} selected={form.wageType === w} onPress={() => set('wageType', w)} />
          ))}
        </View>
        <Input
          label={`Amount (${wageTypeLabel[form.wageType].toLowerCase()})`}
          prefix="৳"
          value={form.wageAmount}
          onChangeText={(v) => set('wageAmount', v.replace(/\D/g, ''))}
          error={errors.wageAmount}
          keyboardType="number-pad"
          placeholder="e.g. 800"
          maxLength={6}
        />
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <NumberStepper label="Workers needed" value={form.workersNeeded} onChange={(v) => set('workersNeeded', v)} min={1} max={100} />
          </View>
          <View style={{ flex: 1 }}>
            <NumberStepper label="Duration" value={form.durationDays} onChange={(v) => set('durationDays', v)} min={1} max={365} suffix="days" />
          </View>
        </View>

        <Text variant="heading" style={styles.section}>
          When & where
        </Text>
        <DateStrip label="Start date" value={form.startDate} onChange={(v) => set('startDate', v)} />
        <LocationFields value={form.location} onChange={(v) => set('location', v)} errors={errors} />

        <Card style={styles.urgent}>
          <View style={[styles.urgentIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="flash" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySemibold">Mark as urgent</Text>
            <Text variant="caption" color="textMuted">
              Shown at the top of the job feed
            </Text>
          </View>
          <Switch value={form.isUrgent} onValueChange={(v) => set('isUrgent', v)} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
        </Card>

        <View style={[styles.note, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text variant="small" color="textMuted" style={{ flex: 1 }}>
            Your job goes live right after the {taka(pricing.jobPost)} payment. The exact address is only shown to workers you hire.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  urgent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  urgentIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, alignItems: 'center' },
});
