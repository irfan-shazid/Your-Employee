import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { CategoryPicker } from '@/components/form/CategoryPicker';
import { LocationFields } from '@/components/form/LocationFields';
import { NumberStepper } from '@/components/form/NumberStepper';
import { PhotoPicker } from '@/components/form/PhotoPicker';
import { TagInput } from '@/components/form/TagInput';
import { Chip, Input, Segmented, Text } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { availabilityLabel, wageTypeLabel } from '@/lib/format';
import { radii, spacing, useTheme } from '@/theme';
import type { Availability, WageType } from '@/types/api';
import type { FieldErrors, SetField, WorkerFormValues } from './useWorkerProfileForm';

type StepProps = { values: WorkerFormValues; set: SetField; errors: FieldErrors };

/** Formats typed digits as YYYY-MM-DD. */
function formatDob(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

export function IdentityStep({ values, set, errors }: StepProps) {
  return (
    <>
      <PhotoPicker kind="avatar" value={values.avatarUrl} onChange={(v) => set('avatarUrl', v)} />
      <Input label="Full name (as on NID)" icon="person-outline" value={values.fullName} onChangeText={(v) => set('fullName', v)} error={errors.fullName} autoComplete="name" />
      <Input
        label="Mobile number"
        icon="call-outline"
        value={values.phone}
        onChangeText={(v) => set('phone', v.replace(/[^\d+\s-]/g, ''))}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="01XXXXXXXXX"
        maxLength={16}
        hint="Shared with an employer only after they hire you"
      />
      <View style={{ gap: 7 }}>
        <Text variant="smallBold">Gender</Text>
        <Segmented
          value={values.gender}
          onChange={(v) => set('gender', v)}
          options={[
            { value: 'MALE', label: 'Male' },
            { value: 'FEMALE', label: 'Female' },
            { value: 'OTHER', label: 'Other' },
          ]}
        />
      </View>
      <Input
        label="Date of birth"
        icon="calendar-outline"
        value={values.dateOfBirth}
        onChangeText={(v) => set('dateOfBirth', formatDob(v))}
        error={errors.dateOfBirth}
        keyboardType="number-pad"
        placeholder="YYYY-MM-DD"
        maxLength={10}
      />
      <Input
        label="NID number"
        icon="id-card-outline"
        value={values.nidNumber}
        onChangeText={(v) => set('nidNumber', v.replace(/\D/g, ''))}
        error={errors.nidNumber}
        keyboardType="number-pad"
        placeholder="10, 13 or 17 digits"
        maxLength={17}
      />
      <PhotoPicker kind="nid" value={values.nidImageId} onChange={(v) => set('nidImageId', v)} label="NID photo (recommended — faster approval)" />
    </>
  );
}

export function LocationStep({ values, set, errors }: StepProps) {
  return <LocationFields value={values.location} onChange={(v) => set('location', v)} errors={errors} />;
}

export function SkillsStep({ values, set, errors }: StepProps) {
  const { categories } = useMeta();
  return (
    <>
      <CategoryPicker categories={categories} selected={values.categoryIds} onChange={(v) => set('categoryIds', v)} error={errors.categoryIds} />
      <TagInput
        label="Special skills"
        value={values.skills}
        onChange={(v) => set('skills', v)}
        placeholder="e.g. tiles, wiring, driving license"
        hint="Press enter or + to add. Employers can search these."
      />
      <NumberStepper label="Years of experience" value={values.experienceYears} onChange={(v) => set('experienceYears', v)} min={0} max={50} suffix="years" />
    </>
  );
}

export function PayStep({ values, set, errors }: StepProps) {
  const { colors } = useTheme();
  return (
    <>
      <View style={{ gap: 7 }}>
        <Text variant="smallBold">I expect to be paid</Text>
        <View style={styles.chips}>
          {(Object.keys(wageTypeLabel) as WageType[]).map((w) => (
            <Chip key={w} label={wageTypeLabel[w]} selected={values.wageType === w} onPress={() => set('wageType', w)} />
          ))}
        </View>
      </View>
      <Input
        label="Expected wage"
        prefix="৳"
        value={values.expectedWage}
        onChangeText={(v) => set('expectedWage', v.replace(/\D/g, ''))}
        error={errors.expectedWage}
        keyboardType="number-pad"
        placeholder="e.g. 800"
        maxLength={6}
      />
      <View style={{ gap: 7 }}>
        <Text variant="smallBold">Availability</Text>
        <View style={styles.chips}>
          {(Object.keys(availabilityLabel) as Availability[]).map((a) => (
            <Chip key={a} label={availabilityLabel[a]} selected={values.availability === a} onPress={() => set('availability', a)} />
          ))}
        </View>
      </View>
      <Input
        label="About you"
        optional
        multiline
        value={values.bio}
        onChangeText={(v) => set('bio', v)}
        placeholder="A few lines about your work, tools you have, places you've worked…"
        maxLength={500}
      />
      <View style={[styles.note, { backgroundColor: colors.infoSoft }]}>
        <Ionicons name="shield-checkmark" size={20} color={colors.info} />
        <Text variant="small" style={{ flex: 1, color: colors.info }}>
          Our team reviews every profile before it goes live. You’ll get a notification as soon as you’re approved.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'flex-start' },
});
