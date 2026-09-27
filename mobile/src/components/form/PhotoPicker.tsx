import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { Button, ScalePressable, Sheet, Text } from '@/components/ui';
import { resolveImageUrl } from '@/lib/config';
import { pickImage } from '@/lib/image';
import { errorMessage } from '@/store/api';
import { useUploadMediaMutation } from '@/features/account/api';
import { useAppDispatch } from '@/store/hooks';
import { toast } from '@/store/slices/ui';
import { radii, spacing, useTheme } from '@/theme';

type Props = {
  kind: 'avatar' | 'nid';
  /** avatar: media URL; nid: media id */
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
};

/** Take/choose a photo, compress it and upload it. Avatars are public, NID photos private. */
export function PhotoPicker({ kind, value, onChange, label }: Props) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [upload, { isLoading }] = useUploadMediaMutation();
  const [sheet, setSheet] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);

  const choose = async (source: 'camera' | 'library') => {
    setSheet(false);
    try {
      const img = await pickImage({ source, square: kind === 'avatar', maxSize: kind === 'avatar' ? 512 : 1200 });
      if (!img) return;
      setLocalUri(img.uri);
      const res = await upload({ data: img.base64, mime: img.mime, purpose: kind }).unwrap();
      onChange(kind === 'avatar' ? res.url : res.id);
    } catch (err) {
      setLocalUri(null);
      dispatch(toast('error', 'Upload failed', errorMessage(err)));
    }
  };

  const open = () => (Platform.OS === 'web' ? choose('library') : setSheet(true));
  const preview = localUri ?? (kind === 'avatar' ? resolveImageUrl(value) : undefined);

  return (
    <>
      {kind === 'avatar' ? (
        <View style={styles.avatarWrap}>
          <ScalePressable onPress={open} accessibilityLabel="Change profile photo" style={[styles.avatar, { backgroundColor: colors.primarySoft, borderColor: colors.surface }]}>
            {preview ? (
              <Image source={preview} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            ) : (
              <Ionicons name="person" size={44} color={colors.primary} />
            )}
            {isLoading ? (
              <View style={[StyleSheet.absoluteFill, styles.loading]}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </ScalePressable>
          <View style={[styles.camera, { backgroundColor: colors.primary, borderColor: colors.bg }]}>
            <Ionicons name="camera" size={16} color={colors.onPrimary} />
          </View>
          <Text variant="caption" color="textMuted" style={{ marginTop: spacing.sm }}>
            {label ?? 'Add a clear photo of your face'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 7 }}>
          <Text variant="smallBold">{label ?? 'NID photo'}</Text>
          <ScalePressable
            onPress={open}
            scaleTo={0.98}
            accessibilityLabel="Add NID photo"
            style={[styles.nid, { borderColor: value ? colors.primary : colors.borderStrong, backgroundColor: value ? colors.primarySoft : colors.surface }]}
          >
            {preview ? <Image source={preview} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : !preview ? (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Ionicons name={value ? 'checkmark-circle' : 'id-card-outline'} size={30} color={colors.primary} />
                <Text variant="smallBold" color="primary">
                  {value ? 'NID photo uploaded — tap to replace' : 'Add front side of your NID'}
                </Text>
                <Text variant="caption" color="textMuted">
                  Only visible to our verification team
                </Text>
              </View>
            ) : null}
          </ScalePressable>
        </View>
      )}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={kind === 'avatar' ? 'Profile photo' : 'NID photo'}>
        <View style={{ gap: spacing.md }}>
          <Button title="Take a photo" icon="camera-outline" variant="soft" onPress={() => choose('camera')} />
          <Button title="Choose from gallery" icon="image-outline" variant="outline" onPress={() => choose('library')} />
          {value ? (
            <Button
              title="Remove photo"
              icon="trash-outline"
              variant="ghost"
              onPress={() => {
                setSheet(false);
                setLocalUri(null);
                onChange(null);
              }}
            />
          ) : null}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', alignSelf: 'center' },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 4,
  },
  loading: { backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  camera: {
    position: 'absolute',
    top: 76,
    right: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nid: {
    height: 150,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
