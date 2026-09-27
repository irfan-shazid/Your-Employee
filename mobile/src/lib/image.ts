import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type PickedImage = { uri: string; base64: string; mime: 'image/jpeg' };

/**
 * Let the user take or choose a photo, then shrink it on-device (≤ maxSize px, JPEG)
 * so uploads stay small and fast on mobile data.
 */
export async function pickImage({
  source,
  maxSize = 800,
  square = false,
}: {
  source: 'camera' | 'library';
  maxSize?: number;
  square?: boolean;
}): Promise<PickedImage | null> {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Permission denied. Allow access in your phone settings.');

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: square ? [1, 1] : [16, 10],
    quality: 1,
  };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > maxSize || asset.height > maxSize) {
    context.resize(asset.width >= asset.height ? { width: maxSize } : { height: maxSize });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.78, base64: true });
  if (!saved.base64) throw new Error('Could not process the image');
  return { uri: saved.uri, base64: saved.base64, mime: 'image/jpeg' };
}
