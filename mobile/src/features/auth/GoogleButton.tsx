import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ScalePressable, Text } from '@/components/ui';
import { authClient } from '@/lib/auth-client';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import { fonts, radii, useTheme } from '@/theme';

/** "Continue with Google" — opens Google in an in-app browser; no verification code needed. */
export function GoogleButton() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const onPress = async () => {
    setLoading(true);
    try {
      const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
      if (error) dispatch(toast('error', 'Google sign-in failed', error.message ?? 'Please try again.'));
    } catch {
      dispatch(toast('error', 'Google sign-in failed', 'Please check your connection and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScalePressable
      onPress={onPress}
      disabled={loading}
      haptic
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color="#EA4335" />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>Continue with Google</Text>
        </>
      )}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
