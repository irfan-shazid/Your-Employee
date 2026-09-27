import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader, Button, Input, Screen, Segmented, Text } from '@/components/ui';
import { collectErrors, normalizePhone, validators } from '@/lib/validation';
import { errorMessage, fieldErrors } from '@/store/api';
import { useSaveEmployerProfileMutation } from '@/features/account/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import { radii, spacing, useTheme } from '@/theme';
import type { EmployerType, OwnEmployer } from '@/types/api';
import { LocationFields } from '@/components/form/LocationFields';
import { PhotoPicker } from '@/components/form/PhotoPicker';

type Props = {
  initial?: OwnEmployer | null;
  defaultName?: string;
  defaultAvatar?: string | null;
  onSaved: () => void;
  title?: string;
  submitLabel?: string;
};

export function EmployerProfileForm({ initial, defaultName, defaultAvatar, onSaved, title = 'Employer profile', submitLabel = 'Submit for approval' }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [save, { isLoading }] = useSaveEmployerProfileMutation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    type: (initial?.type ?? 'INDIVIDUAL') as EmployerType,
    avatarUrl: initial?.avatarUrl ?? defaultAvatar ?? null,
    fullName: initial?.fullName ?? defaultName ?? '',
    companyName: initial?.companyName ?? '',
    phone: initial?.phone ?? '',
    nidNumber: initial?.nidNumber ?? '',
    tradeLicense: initial?.tradeLicense ?? '',
    location: {
      division: initial?.division ?? '',
      district: initial?.district ?? '',
      area: initial?.area ?? '',
      address: initial?.address ?? '',
    },
    about: initial?.about ?? '',
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const business = form.type === 'BUSINESS';

  const submit = async () => {
    const found = collectErrors({
      fullName: validators.name(form.fullName),
      companyName: business && form.companyName.trim().length < 2 ? 'Business name is required' : undefined,
      phone: validators.phone(form.phone),
      nidNumber: form.nidNumber || form.tradeLicense ? validators.nid(form.nidNumber, false) : 'Provide your NID or a trade license number',
      division: validators.required(form.location.division, 'Division'),
      district: validators.required(form.location.district, 'District'),
      area: form.location.area.trim().length >= 2 ? undefined : 'Area is required',
    });
    setErrors(found ?? {});
    if (found) {
      dispatch(toast('error', 'Please check the highlighted fields'));
      return;
    }
    try {
      await save({
        type: form.type,
        avatarUrl: form.avatarUrl,
        fullName: form.fullName.trim(),
        companyName: business ? form.companyName.trim() : null,
        phone: normalizePhone(form.phone),
        nidNumber: form.nidNumber.trim() || null,
        tradeLicense: form.tradeLicense.trim() || null,
        division: form.location.division,
        district: form.location.district,
        area: form.location.area.trim(),
        address: form.location.address.trim() || null,
        about: form.about.trim() || null,
      }).unwrap();
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      dispatch(toast('error', "Couldn't save your profile", errorMessage(err)));
    }
  };

  return (
    <Screen
      keyboard
      header={<AppHeader title={title} />}
      footer={<Button title={submitLabel} iconRight="checkmark" onPress={submit} loading={isLoading} />}
    >
      <View style={{ gap: spacing.lg }}>
        <PhotoPicker kind="avatar" value={form.avatarUrl} onChange={(v) => set('avatarUrl', v)} label={business ? 'Add your logo or photo' : 'Add a clear photo'} />

        <View style={{ gap: 7 }}>
          <Text variant="smallBold">I am hiring as</Text>
          <Segmented
            value={form.type}
            onChange={(v) => set('type', v)}
            options={[
              { value: 'INDIVIDUAL', label: 'Individual / Household' },
              { value: 'BUSINESS', label: 'Business' },
            ]}
          />
        </View>

        {business ? (
          <Input label="Business name" icon="business-outline" value={form.companyName} onChangeText={(v) => set('companyName', v)} error={errors.companyName} placeholder="e.g. Karim Traders" />
        ) : null}
        <Input
          label={business ? 'Contact person (as on NID)' : 'Full name (as on NID)'}
          icon="person-outline"
          value={form.fullName}
          onChangeText={(v) => set('fullName', v)}
          error={errors.fullName}
        />
        <Input
          label="Mobile number"
          icon="call-outline"
          value={form.phone}
          onChangeText={(v) => set('phone', v.replace(/[^\d+\s-]/g, ''))}
          error={errors.phone}
          keyboardType="phone-pad"
          placeholder="01XXXXXXXXX"
          maxLength={16}
          hint="Shared with a worker only after you hire them"
        />
        <Input
          label="NID number"
          optional={business}
          icon="id-card-outline"
          value={form.nidNumber}
          onChangeText={(v) => set('nidNumber', v.replace(/\D/g, ''))}
          error={errors.nidNumber}
          keyboardType="number-pad"
          maxLength={17}
          placeholder="10, 13 or 17 digits"
        />
        {business ? (
          <Input label="Trade license number" optional icon="document-text-outline" value={form.tradeLicense} onChangeText={(v) => set('tradeLicense', v)} maxLength={40} />
        ) : null}

        <Text variant="heading" style={{ marginTop: spacing.sm }}>
          Location
        </Text>
        <LocationFields value={form.location} onChange={(v) => set('location', v)} errors={errors} />

        <Input
          label={business ? 'About your business' : 'About you'}
          optional
          multiline
          value={form.about}
          onChangeText={(v) => set('about', v)}
          placeholder="What kind of work do you usually hire for?"
          maxLength={500}
        />

        <View style={[styles.note, { backgroundColor: colors.infoSoft }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.info} />
          <Text variant="small" style={{ flex: 1, color: colors.info }}>
            We verify every employer to keep workers safe. You’ll be notified once approved.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'flex-start' },
});
