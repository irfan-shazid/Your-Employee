import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppHeader, Button, Card, Pill, Screen, Text } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { usePayment } from '@/features/payments/usePayment';
import { daysUntil, formatDate, money, taka } from '@/lib/format';
import { useGetMeQuery } from '@/features/account/api';
import { fonts, radii, spacing, useTheme } from '@/theme';
import type { PaymentMethod } from '@/types/api';

const perks = [
  { icon: 'paper-plane', title: 'Apply to unlimited jobs', text: 'Send applications to any open job in Bangladesh.' },
  { icon: 'eye', title: 'Get discovered', text: 'Appear when employers search your category and district.' },
  { icon: 'mail-unread', title: 'Receive direct offers', text: 'Employers can hire you without posting a job.' },
  { icon: 'notifications', title: 'Job alerts near you', text: 'Be the first to know about new work in your area.' },
] as const;

/** Footer line naming the ways to pay that the server has enabled. */
function paymentHint(methods: PaymentMethod[]) {
  const ssl = methods.some((m) => m.id === 'SSLCOMMERZ');
  const stripe = methods.some((m) => m.id === 'STRIPE');
  if (ssl && stripe) return 'Secure payment · bKash, Nagad, Rocket & local cards, or international cards via Stripe';
  if (stripe) return 'Secure card payment by Stripe';
  return 'Secure payment by SSLCommerz · bKash, Nagad, Rocket & cards';
}

export default function Subscription() {
  const { colors } = useTheme();
  const { pricing, features, paymentMethods } = useMeta();
  const enabledMethods = paymentMethods.filter((m) => m.enabled);
  const card = enabledMethods.find((m) => m.id === 'STRIPE');
  const { data: me } = useGetMeQuery();
  const { pay, paying } = usePayment();
  const w = me?.worker;
  const active = Boolean(w?.subscriptionActive);

  const onPay = async () => {
    const ok = await pay('WORKER_SUBSCRIPTION');
    if (ok && router.canGoBack()) router.back();
  };

  return (
    <Screen
      header={<AppHeader title="Worker plan" />}
      footer={
        <>
          <Button
            title={active ? `Extend ${pricing.subscriptionDays} days · ${taka(pricing.workerMonthly)}` : `Pay ${taka(pricing.workerMonthly)} & activate`}
            icon="lock-closed"
            onPress={onPay}
            loading={paying}
            disabled={!features.payments}
          />
          <Text variant="caption" color="textSubtle" align="center">
            {features.payments ? paymentHint(enabledMethods) : 'Payments are not configured on the server yet'}
          </Text>
        </>
      }
    >
      <Animated.View entering={FadeInDown.duration(350)}>
        <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.price}>
          <Pill label={active ? 'Active' : 'Monthly'} tone={active ? 'success' : 'neutral'} />
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{taka(pricing.workerMonthly)}</Text>
            <Text style={styles.per}>/ {pricing.subscriptionDays} days</Text>
          </View>
          <Text style={styles.priceSub}>
            {active && w
              ? `Active until ${formatDate(w.subscriptionExpiresAt)} (${daysUntil(w.subscriptionExpiresAt)} days left). Paying now adds ${pricing.subscriptionDays} more days.`
              : 'Less than ৳2 a day to get steady work.'}
            {card ? ` Paying from abroad? ${money(card.prices.WORKER_SUBSCRIPTION, card.currency)} by card.` : ''}
          </Text>
        </LinearGradient>
      </Animated.View>

      <Card style={{ marginTop: spacing.xl, gap: spacing.lg }}>
        {perks.map((p, i) => (
          <Animated.View key={p.title} entering={FadeInDown.delay(80 + i * 60)} style={styles.perk}>
            <View style={[styles.perkIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={p.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodySemibold">{p.title}</Text>
              <Text variant="small" color="textMuted">
                {p.text}
              </Text>
            </View>
          </Animated.View>
        ))}
      </Card>

      <View style={[styles.note, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
        <Text variant="small" color="textMuted" style={{ flex: 1 }}>
          No auto-renewal — you’re never charged automatically. Renew anytime from your profile.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: { borderRadius: radii.xl, padding: spacing.xxl, gap: spacing.sm },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: spacing.sm },
  amount: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 44, lineHeight: 50 },
  per: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.semibold, fontSize: 16, lineHeight: 30 },
  priceSub: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  perk: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  perkIcon: { width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, marginTop: spacing.lg, alignItems: 'center' },
});
