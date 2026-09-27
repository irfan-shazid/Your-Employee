import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { radii, useTheme } from '@/theme';
import { Text } from './Text';

type Props<T extends string> = {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
};

/** iOS-style segmented control with a sliding indicator. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors, dark } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width / options.length;

  const indicator = useAnimatedStyle(() => ({
    width: segment - 6,
    transform: [{ translateX: withSpring(index * segment + 3, { damping: 18, stiffness: 220 }) }],
  }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
      accessibilityRole="tablist"
    >
      {width > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: dark ? colors.border : colors.surface, boxShadow: '0px 1px 4px rgba(15,23,42,0.12)' },
            indicator,
          ]}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text variant="smallBold" color={active ? 'text' : 'textMuted'} numberOfLines={1}>
              {o.label}
              {o.count ? ` · ${o.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', height: 42, borderRadius: radii.md, alignItems: 'center' },
  indicator: { position: 'absolute', top: 3, bottom: 3, left: 0, borderRadius: radii.sm },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', paddingHorizontal: 4 },
});
