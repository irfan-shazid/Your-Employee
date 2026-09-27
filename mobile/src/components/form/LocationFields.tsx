import { View } from 'react-native';

import { Input, SelectField } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { spacing } from '@/theme';

export type LocationValue = { division: string; district: string; area: string; address: string };

type Props = {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  errors?: Partial<Record<keyof LocationValue, string>>;
  showAddress?: boolean;
  areaLabel?: string;
};

/** Division → District → Area pickers for Bangladesh. */
export function LocationFields({ value, onChange, errors = {}, showAddress = true, areaLabel = 'Area / Upazila' }: Props) {
  const { divisionOptions, districtOptions } = useMeta();

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <SelectField
            label="Division"
            placeholder="Select"
            options={divisionOptions}
            value={value.division || null}
            onChange={(division) => onChange({ ...value, division, district: '' })}
            error={errors.division}
            sheetTitle="Choose division"
          />
        </View>
        <View style={{ flex: 1 }}>
          <SelectField
            label="District"
            placeholder={value.division ? 'Select' : 'Division first'}
            options={districtOptions(value.division)}
            value={value.district || null}
            onChange={(district) => onChange({ ...value, district })}
            error={errors.district}
            disabled={!value.division}
            searchable
            sheetTitle="Choose district"
          />
        </View>
      </View>
      <Input
        label={areaLabel}
        icon="location-outline"
        value={value.area}
        onChangeText={(area) => onChange({ ...value, area })}
        error={errors.area}
        placeholder="e.g. Mirpur 10, Tongi, Savar"
        maxLength={80}
      />
      {showAddress ? (
        <Input
          label="Address"
          optional
          icon="home-outline"
          value={value.address}
          onChangeText={(address) => onChange({ ...value, address })}
          placeholder="House, road, landmark"
          maxLength={200}
        />
      ) : null}
    </View>
  );
}
