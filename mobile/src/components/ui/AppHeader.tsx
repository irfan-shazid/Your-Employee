import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  /** Show a back button (defaults to true). */
  back?: boolean;
  right?: ReactNode;
  /** Large title for tab root screens. */
  large?: boolean;
};

export function AppHeader({ title, subtitle, back = true, right, large = false }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (large) {
    return (
      <View style={[styles.large, { paddingTop: insets.top + spacing.md, backgroundColor: colors.bg }]}>
        <View style={{ flex: 1 }}>
          <Text variant="title" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="small" color="textMuted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    );
  }

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm, backgroundColor: colors.bg }]}>
      <View style={styles.side}>
        {back ? (
          <IconButton
            icon="chevron-back"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        ) : null}
      </View>
      <View style={styles.center}>
        <Text variant="subheading" numberOfLines={1} align="center">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={1} align="center">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  large: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  right: { flexDirection: 'row', gap: spacing.sm },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  side: { width: 88 },
  center: { flex: 1 },
});
