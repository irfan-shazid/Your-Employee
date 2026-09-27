import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, ScalePressable, Screen, Text } from '@/components/ui';
import { useMeta } from '@/features/meta/useMeta';
import { signOutEverywhere } from '@/features/auth/session';
import { taka } from '@/lib/format';
import { useGetMeQuery } from '@/features/account/api';
import { useAppDispatch } from '@/store/hooks';
import { radii, spacing, useTheme } from '@/theme';

type Choice = 'worker' | 'employer';

export default function ChooseRole() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { pricing } = useMeta();
  const { data: me } = useGetMeQuery();
  const [choice, setChoice] = useState<Choice | null>(null);

  const firstName = me?.user.name.split(' ')[0];

  const options: { key: Choice; icon: ComponentProps<typeof Ionicons>['name']; title: string; titleBn: string; text: string; points: string[] }[] = [
    {
      key: 'worker',
      icon: 'construct',
      title: 'I want work',
      titleBn: 'আমি কাজ খুঁজছি',
      text: 'Get hired for daily labor, skilled trades and more.',
      points: ['Apply to jobs near you', 'Get direct offers from employers', `${taka(pricing.workerMonthly)}/month after approval`],
    },
    {
      key: 'employer',
      icon: 'briefcase',
      title: 'I want to hire',
      titleBn: 'আমি কর্মী নিতে চাই',
      text: 'Post jobs or find verified workers by category.',
      points: ['Browse verified workers', 'Post a job for ' + taka(pricing.jobPost), `${taka(pricing.hire)} per hire — no monthly fee`],
    },
  ];

  return (
    <Screen
      safeTop
      footer={
        <Button
          title="Continue"
          iconRight="arrow-forward"
          disabled={!choice}
          onPress={() => router.push(choice === 'worker' ? '/onboarding/worker' : '/onboarding/employer')}
        />
      }
    >
      <Animated.View entering={FadeInDown.duration(350)} style={{ gap: 6, marginTop: spacing.lg, marginBottom: spacing.xxl }}>
        <Text variant="display">{firstName ? `Hi ${firstName} 👋` : 'Welcome 👋'}</Text>
        <Text color="textMuted">How do you want to use Your Employee? You can’t switch later, so pick what fits you best.</Text>
      </Animated.View>

      <View style={{ gap: spacing.lg }}>
        {options.map((o, i) => {
          const active = choice === o.key;
          return (
            <Animated.View key={o.key} entering={FadeInDown.delay(100 + i * 90).duration(350)}>
              <ScalePressable
                onPress={() => setChoice(o.key)}
                haptic
                scaleTo={0.98}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.card,
                  {
                    backgroundColor: active ? colors.primarySoft : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.icon, { backgroundColor: active ? colors.primary : colors.surfaceAlt }]}>
                    <Ionicons name={o.icon} size={26} color={active ? colors.onPrimary : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="heading">{o.title}</Text>
                    <Text variant="small" color="textMuted">
                      {o.titleBn}
                    </Text>
                  </View>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={24} color={active ? colors.primary : colors.borderStrong} />
                </View>
                <Text color="textMuted">{o.text}</Text>
                <View style={{ gap: 6 }}>
                  {o.points.map((p) => (
                    <View key={p} style={styles.point}>
                      <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
                      <Text variant="smallMedium">{p}</Text>
                    </View>
                  ))}
                </View>
              </ScalePressable>
            </Animated.View>
          );
        })}
      </View>

      <Button title="Sign out" variant="ghost" onPress={() => signOutEverywhere(dispatch)} style={{ marginTop: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 2, padding: spacing.xl, gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  point: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
