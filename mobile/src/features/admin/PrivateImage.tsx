import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { getAuthCookie } from '@/lib/auth-client';
import { API_URL } from '@/lib/config';
import { useTheme } from '@/theme';

/** Loads a private media file (e.g. NID photo) with the admin's session cookie. */
export function PrivateImage({ mediaId, style }: { mediaId: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const [cookie, setCookie] = useState<string | null | undefined>(Platform.OS === 'web' ? null : undefined);

  useEffect(() => {
    if (Platform.OS !== 'web') getAuthCookie().then(setCookie);
  }, []);

  if (cookie === undefined) {
    return (
      <View style={[style, styles.center, { backgroundColor: colors.surfaceAlt }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: `${API_URL}/api/media/${mediaId}`, headers: cookie ? { Cookie: cookie } : undefined }}
      style={[{ backgroundColor: colors.surfaceAlt }, style as object]}
      contentFit="contain"
      cachePolicy="memory"
      transition={150}
    />
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
