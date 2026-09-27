import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import { router } from 'expo-router';

export function AuthScaffold({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <IconButton icon="chevron-back" accessibilityLabel="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
        <Animated.View entering={FadeInDown.duration(350)} style={styles.head}>
          <Text variant="display">{title}</Text>
          <Text color="textMuted">{subtitle}</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(80).duration(350)} style={{ gap: spacing.lg }}>
          {children}
        </Animated.View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function OrDivider() {
  const { colors } = useTheme();
  return (
    <View style={styles.or}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <Text variant="caption" color="textSubtle">
        OR
      </Text>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xxl, flexGrow: 1 },
  head: { gap: spacing.sm, marginTop: spacing.xxl, marginBottom: spacing.xxl },
  footer: { marginTop: 'auto', paddingTop: spacing.xxl, alignItems: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
