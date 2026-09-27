import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, Text } from '@/components/ui';
import { radii, spacing, useTheme } from '@/theme';
import type { OwnWorker } from '@/types/api';
import { IdentityStep, LocationStep, PayStep, SkillsStep } from './steps';
import { STEPS, useWorkerProfileForm } from './useWorkerProfileForm';

const STEP_COMPONENTS = [IdentityStep, LocationStep, SkillsStep, PayStep];

type Props = {
  initial?: OwnWorker | null;
  defaultName?: string;
  defaultAvatar?: string | null;
  onSaved: () => void;
  onBack?: () => void;
  submitLabel?: string;
};

/** Four-step worker profile used for onboarding and for editing an existing profile. */
export function WorkerProfileForm({ onBack, submitLabel = 'Submit for approval', ...opts }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const form = useWorkerProfileForm(opts);
  const Step = STEP_COMPONENTS[form.step]!;

  const goNext = async () => {
    if ((await form.next()) && !form.isLastStep) scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton
          icon={form.step === 0 ? 'close' : 'chevron-back'}
          accessibilityLabel="Back"
          onPress={() => (form.step === 0 ? onBack?.() : form.back())}
        />
        <View style={styles.progress} accessibilityLabel={`Step ${form.step + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={[styles.progressBar, { backgroundColor: i <= form.step ? colors.primary : colors.border }]} />
          ))}
        </View>
        <Text variant="smallBold" color="textMuted">
          {form.step + 1}/{STEPS.length}
        </Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View key={form.step} entering={FadeInRight.duration(260)} exiting={FadeOutLeft.duration(120)} style={{ gap: spacing.lg }}>
          <View style={{ gap: 4, marginBottom: spacing.sm }}>
            <Text variant="title">{STEPS[form.step]!.title}</Text>
            <Text color="textMuted">{STEPS[form.step]!.subtitle}</Text>
          </View>
          <Step values={form.values} set={form.set} errors={form.errors} />
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <Button
          title={form.isLastStep ? submitLabel : 'Continue'}
          iconRight={form.isLastStep ? 'checkmark' : 'arrow-forward'}
          onPress={goNext}
          loading={form.saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  progressBar: { flex: 1, height: 5, borderRadius: radii.pill },
  content: { padding: spacing.xl, paddingBottom: spacing.huge },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
