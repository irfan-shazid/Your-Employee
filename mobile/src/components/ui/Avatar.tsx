import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { resolveImageUrl } from '@/lib/config';
import { fonts, useTheme } from '@/theme';
import { Text } from './Text';

const tints = ['#0E8F63', '#2563EB', '#C2410C', '#7C3AED', '#0B7285', '#BE185D', '#4D7C0F', '#B45309'];

function initials(name?: string | null) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase();
}

function tintFor(name?: string | null) {
  let hash = 0;
  for (const ch of name ?? '') hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return tints[Math.abs(hash) % tints.length]!;
}

type Props = { uri?: string | null; name?: string | null; size?: number; verified?: boolean };

export function Avatar({ uri, name, size = 48, verified }: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const source = resolveImageUrl(uri);
  const tint = tintFor(name);

  return (
    <View style={{ width: size, height: size }}>
      {source ? (
        <Image
          source={source}
          style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt }}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={source}
          accessibilityIgnoresInvertColors
        />
      ) : (
        // Opaque surface first, tint on top — stays readable on gradients and photos.
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface }]}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: `${tint}${theme.dark ? '33' : '1F'}` }]} />
          {name ? (
            <Text style={{ color: tint, fontFamily: fonts.bold, fontSize: size * 0.36, lineHeight: size * 0.44 }}>{initials(name)}</Text>
          ) : (
            <Ionicons name="person" size={size * 0.5} color={tint} />
          )}
        </View>
      )}
      {verified ? (
        <View
          style={[
            styles.verified,
            { backgroundColor: colors.surface, width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18 },
          ]}
        >
          <Ionicons name="checkmark-circle" size={size * 0.34} color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  verified: { position: 'absolute', right: -2, bottom: -2, alignItems: 'center', justifyContent: 'center' },
});
