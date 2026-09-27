import { useMemo } from 'react';

import type { Option } from '@/components/ui';
import { useGetMetaQuery } from './api';

const DEFAULT_PRICING = { workerMonthly: 50, jobPost: 10, hire: 10, subscriptionDays: 30, currency: 'BDT' as const };
const NO_FEATURES = { googleSignIn: false, payments: false };

/** Categories, divisions, pricing & payment methods plus ready-made picker options. Fetched once, cached for an hour. */
export function useMeta() {
  const { data, isLoading, refetch } = useGetMetaQuery();

  return useMemo(() => {
    const categories = data?.categories ?? [];
    const divisions = data?.divisions ?? [];

    return {
      loaded: Boolean(data),
      isLoading,
      refetch,
      categories,
      divisions,
      categoryById: new Map(categories.map((c) => [c.id, c])),
      categoryOptions: categories.map<Option>((c) => ({ value: c.id, label: c.name, sublabel: c.nameBn, icon: c.icon as Option['icon'] })),
      divisionOptions: divisions.map<Option>((d) => ({ value: d.name, label: d.name, sublabel: d.nameBn })),
      districtOptions: (division?: string | null): Option[] =>
        (divisions.find((d) => d.name === division)?.districts ?? []).map((name) => ({ value: name, label: name })),
      allDistrictOptions: divisions.flatMap((d) => d.districts.map<Option>((name) => ({ value: name, label: name, sublabel: `${d.name} division` }))),
      pricing: data?.pricing ?? DEFAULT_PRICING,
      /** Gateways the server offers (enabled first), each with its own currency and prices. */
      paymentMethods: data?.paymentMethods ?? [],
      features: data?.features ?? NO_FEATURES,
    };
  }, [data, isLoading, refetch]);
}
