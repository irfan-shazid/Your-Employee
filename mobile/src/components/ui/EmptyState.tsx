import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { spacing, useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'primary' | 'danger';
};

export function EmptyState({ icon, title, message, actionLabel, onAction, tone = 'primary' }: Props) {
  const { colors } = useTheme();
  const fg = tone === 'danger' ? colors.danger : colors.primary;
  const bg = tone === 'danger' ? colors.dangerSoft : colors.primarySoft;

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.wrap}>
      <View style={[styles.iconOuter, { backgroundColor: bg }]}>
        <View style={[styles.iconInner, { backgroundColor: colors.surface }]}>
          <Ionicons name={icon} size={30} color={fg} />
        </View>
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textMuted" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="soft" size="md" fullWidth={false} style={{ marginTop: spacing.sm, alignSelf: 'center' }} />
      ) : null}
    </Animated.View>
  );
}

/** Error state with a retry button, used when a request fails. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState icon="cloud-offline-outline" title="Couldn't load this" message={message} actionLabel={onRetry ? 'Try again' : undefined} onAction={onRetry} tone="danger" />
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.huge, paddingHorizontal: spacing.xxl, gap: spacing.sm },
  iconOuter: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  iconInner: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  message: { maxWidth: 320 },
});
