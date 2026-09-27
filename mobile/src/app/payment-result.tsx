import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Button, Screen, Text } from '@/components/ui';
import { api } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { spacing, useTheme } from '@/theme';

const COPY = {
  success: { title: 'Payment successful', message: 'Thank you! Your account has been updated.', icon: 'checkmark', tone: 'success' },
  processing: {
    title: 'Payment processing',
    message: "Your payment is being confirmed. We'll notify you as soon as it clears.",
    icon: 'time-outline',
    tone: 'warning',
  },
  cancelled: { title: 'Payment cancelled', message: 'No money was taken.', icon: 'close', tone: 'textMuted' },
  failed: { title: 'Payment failed', message: 'No money was taken. Please try again.', icon: 'alert', tone: 'danger' },
} as const;

/**
 * Deep-link target after the payment gateway (SSLCommerz or Stripe). Usually the in-app browser
 * catches this link itself, but on some Android browsers the link opens the app directly — this
 * screen handles that.
 */
export default function PaymentResult() {
  const { status } = useLocalSearchParams<{ status?: string; tranId?: string }>();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const copy = COPY[status && status in COPY ? (status as keyof typeof COPY) : 'failed'];
  const tone = colors[copy.tone];

  useEffect(() => {
    dispatch(api.util.invalidateTags(['Me', 'MyJobs', 'Jobs', 'Hires', 'Applicants', 'Payments', 'UnreadCount']));
  }, [dispatch]);

  return (
    <Screen scroll={false} safeTop contentStyle={styles.center}>
      <Animated.View entering={ZoomIn.springify()} style={[styles.icon, { backgroundColor: `${tone}22` }]}>
        <Ionicons name={copy.icon} size={48} color={tone} />
      </Animated.View>
      <Text variant="title" align="center">
        {copy.title}
      </Text>
      <Text color="textMuted" align="center">
        {copy.message}
      </Text>
      <View style={{ height: spacing.lg }} />
      <Button title="Continue" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'stretch', gap: spacing.sm, paddingHorizontal: spacing.xxl },
  icon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
});
