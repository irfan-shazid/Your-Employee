import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, StatusPill, Text } from '@/components/ui';
import { formatDate, money, paymentMethodLabel, purposeLabel } from '@/lib/format';
import { radii, spacing, useTheme } from '@/theme';
import type { Payment } from '@/types/api';

const ICONS = { WORKER_SUBSCRIPTION: 'shield-checkmark', JOB_POST: 'megaphone', HIRE: 'ribbon' } as const;

export const PaymentRow = memo(function PaymentRow({ payment: p }: { payment: Payment }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={ICONS[p.purpose]} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodySemibold">{purposeLabel[p.purpose]}</Text>
        <Text variant="caption" color="textMuted">
          {formatDate(p.paidAt ?? p.createdAt)} · {paymentMethodLabel(p)}
        </Text>
        <Text variant="caption" color="textSubtle" selectable>
          {p.tranId}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text variant="subheading">{money(p.amount, p.currency)}</Text>
        <StatusPill status={p.status} />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
});
