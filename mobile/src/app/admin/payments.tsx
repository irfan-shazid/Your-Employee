import { useState } from 'react';
import { View } from 'react-native';

import { ChipFilter } from '@/components/lists/ChipFilter';
import { InfiniteList } from '@/components/lists/InfiniteList';
import { AppHeader, EmptyState } from '@/components/ui';
import { useGetAdminPaymentsInfiniteQuery } from '@/features/admin/api';
import { AdminPaymentRow } from '@/features/admin/rows';
import { spacing, useTheme } from '@/theme';
import type { PaymentProvider, PaymentPurpose, PaymentStatus } from '@/types/api';

const STATUSES = [
  { value: undefined, label: 'All statuses' },
  { value: 'SUCCESS', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

const PURPOSES = [
  { value: undefined, label: 'All types' },
  { value: 'WORKER_SUBSCRIPTION', label: 'Monthly worker plan' },
  { value: 'JOB_POST', label: 'Job post' },
  { value: 'HIRE', label: 'Hiring fee' },
] as const;

const PROVIDERS = [
  { value: undefined, label: 'All gateways' },
  { value: 'SSLCOMMERZ', label: 'SSLCommerz' },
  { value: 'STRIPE', label: 'Stripe' },
] as const;

/** Every transaction on both gateways, filterable by status, type and gateway. */
export default function AdminPayments() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<PaymentStatus | undefined>('SUCCESS');
  const [purpose, setPurpose] = useState<PaymentPurpose | undefined>();
  const [provider, setProvider] = useState<PaymentProvider | undefined>();
  const payments = useGetAdminPaymentsInfiniteQuery({ status, purpose, provider });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="Payments" large back={false} subtitle="SSLCommerz and Stripe transactions" />
      <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        <ChipFilter options={STATUSES} value={status} onChange={setStatus} padding={spacing.xl} />
        <ChipFilter options={PURPOSES} value={purpose} onChange={setPurpose} padding={spacing.xl} />
        <ChipFilter options={PROVIDERS} value={provider} onChange={setProvider} padding={spacing.xl} />
      </View>
      <InfiniteList
        query={payments}
        gap={spacing.sm}
        skeletons={4}
        renderItem={(payment) => <AdminPaymentRow payment={payment} />}
        empty={<EmptyState icon="wallet-outline" title="No payments" message="Transactions matching these filters will show here." />}
      />
    </View>
  );
}
