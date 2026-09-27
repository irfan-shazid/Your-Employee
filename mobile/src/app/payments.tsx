import { View } from 'react-native';

import { InfiniteList, usePagedItems } from '@/components/lists/InfiniteList';
import { AppHeader, EmptyState } from '@/components/ui';
import { useGetPaymentsInfiniteQuery } from '@/features/payments/api';
import { PaymentRow } from '@/features/payments/PaymentRow';
import { moneyTotals } from '@/lib/format';
import { spacing, useTheme } from '@/theme';

/** The signed-in user's payments (SSLCommerz and Stripe). */
export default function PaymentHistory() {
  const { colors } = useTheme();
  const payments = useGetPaymentsInfiniteQuery();
  const total = moneyTotals(usePagedItems(payments).filter((p) => p.status === 'SUCCESS'));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title="Payments" subtitle={total ? `${total} paid in total` : undefined} />
      <InfiniteList
        query={payments}
        gap={spacing.sm}
        skeletons={4}
        renderItem={(payment) => <PaymentRow payment={payment} />}
        empty={<EmptyState icon="receipt-outline" title="No payments yet" message="Your subscription, job post and hiring payments will appear here." />}
      />
    </View>
  );
}
