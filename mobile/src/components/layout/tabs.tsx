import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Platform, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Shared look for every role's bottom tab bar. */
export function useTabScreenOptions() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    animation: 'shift' as const,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSubtle,
    sceneStyle: { backgroundColor: colors.bg },
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      height: 62 + insets.bottom,
      paddingTop: 6,
      paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0),
    },
    tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, marginTop: 2 },
    tabBarBadgeStyle: { backgroundColor: colors.accent, fontFamily: fonts.bold, fontSize: 10 },
  };
}

/** Filled icon when focused, outline otherwise. */
export function tabIcon(name: string) {
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={(focused ? name : `${name}-outline`) as IconName} size={size - 1} color={color} />;
  }
  return TabIcon;
}
