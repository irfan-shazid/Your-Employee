import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

/** Read-only star rating: ★ 4.6 (12) */
export function Rating({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  const { colors } = useTheme();
  if (!count) {
    return (
      <View style={styles.row}>
        <Ionicons name="sparkles" size={size} color={colors.primary} />
        <Text variant="caption" color="primary">
          New
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <Ionicons name="star" size={size} color={colors.star} />
      <Text variant="smallBold">{value.toFixed(1)}</Text>
      <Text variant="caption" color="textMuted">
        ({count})
      </Text>
    </View>
  );
}

export function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color={colors.star}
        />
      ))}
    </View>
  );
}

const labels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** Tappable 5-star input used when reviewing a worker. */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={[styles.row, { gap: 10 }]}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable
            key={i}
            hitSlop={6}
            accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
              onChange(i);
            }}
          >
            <Ionicons name={value >= i ? 'star' : 'star-outline'} size={38} color={value >= i ? colors.star : colors.borderStrong} />
          </Pressable>
        ))}
      </View>
      <Text variant="smallBold" color={value ? 'text' : 'textSubtle'}>
        {value ? labels[value] : 'Tap to rate'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
