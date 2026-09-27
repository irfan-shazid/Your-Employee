import { ActivityIndicator, View } from 'react-native';

import { Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

/** Footer for infinite lists: spinner while loading more, a subtle end marker otherwise. */
export function ListFooter({ loading, done, count }: { loading: boolean; done: boolean; count: number }) {
  const { colors } = useTheme();
  if (loading) {
    return (
      <View style={{ paddingVertical: spacing.xl }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (done && count > 4) {
    return (
      <Text variant="caption" color="textSubtle" align="center" style={{ paddingVertical: spacing.xl }}>
        You’re all caught up
      </Text>
    );
  }
  return <View style={{ height: spacing.xl }} />;
}
