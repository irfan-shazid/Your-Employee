import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Sheet, Text } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { money, purposeLabel } from '@/lib/format';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { radii, spacing, useTheme } from '@/theme';
import type { PaymentProvider } from '@/types/api';
import { resolvePaymentMethod } from './methodPicker';

const ICONS: Record<PaymentProvider, ComponentProps<typeof Ionicons>['name']> = {
  SSLCOMMERZ: 'phone-portrait-outline',
  STRIPE: 'card-outline',
};

/** "How would you like to pay?" — mounted once in the root layout, opened by choosePaymentMethod(). */
export function PaymentMethodSheet() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const picker = useAppSelector((s) => s.ui.paymentPicker);
  const methods = useMeta().paymentMethods.filter((m) => m.enabled);
  const close = () => dispatch(resolvePaymentMethod(null));

  return (
    <Sheet
      visible={Boolean(picker)}
      onClose={close}
      title="How would you like to pay?"
      subtitle={picker ? purposeLabel[picker.purpose] : undefined}
    >
      <View style={{ gap: spacing.md }}>
        {picker
          ? methods.map((m, i) => {
              const price = money(m.prices[picker.purpose], m.currency);
              const tint = i === 0 ? { bg: colors.primarySoft, fg: colors.primary } : { bg: colors.infoSoft, fg: colors.info };
              return (
                <Card key={m.id} onPress={() => dispatch(resolvePaymentMethod(m.id))} style={styles.row} accessibilityLabel={`Pay ${price} with ${m.name}`}>
                  <View style={[styles.icon, { backgroundColor: tint.bg }]}>
                    <Ionicons name={ICONS[m.id]} size={22} color={tint.fg} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodySemibold">{m.name}</Text>
                    <Text variant="small" color="textMuted">
                      {m.description}
                    </Text>
                  </View>
                  <Text variant="subheading">{price}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
                </Card>
              );
            })
          : null}
        <Text variant="caption" color="textSubtle" align="center" style={styles.note}>
          <Ionicons name="lock-closed" size={11} color={colors.textSubtle} /> Paid on the gateway&apos;s secure page. We never see your
          card or wallet PIN.
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: spacing.xs },
});
