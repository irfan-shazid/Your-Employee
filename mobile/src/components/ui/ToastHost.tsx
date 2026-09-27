import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { dismissToast } from '@/store/slices/ui';
import { radii, spacing, useTheme } from '@/theme';
import { Text } from './Text';

/** Renders toasts pushed through the Redux `ui` slice (dispatch(toast('success', '…'))). */
export function ToastHost() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.sm }]}>
      {toasts.map((t) => {
        const tone =
          t.type === 'success'
            ? { icon: 'checkmark-circle' as const, color: colors.success }
            : t.type === 'error'
              ? { icon: 'alert-circle' as const, color: colors.danger }
              : { icon: 'information-circle' as const, color: colors.info };
        return (
          <Animated.View key={t.id} entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp.duration(180)} layout={LinearTransition}>
            <Pressable
              onPress={() => dispatch(dismissToast(t.id))}
              accessibilityRole="alert"
              style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: shadow.raised }]}
            >
              <Ionicons name={tone.icon} size={24} color={tone.color} />
              <View style={{ flex: 1 }}>
                <Text variant="bodySemibold">{t.title}</Text>
                {t.message ? (
                  <Text variant="small" color="textMuted">
                    {t.message}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: spacing.lg, right: spacing.lg, gap: spacing.sm, zIndex: 1000, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    width: '100%',
    maxWidth: 520,
  },
});
