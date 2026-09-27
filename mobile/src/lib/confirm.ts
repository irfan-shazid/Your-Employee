import { Alert, Platform } from 'react-native';

/** Native confirm dialog (window.confirm on web). Resolves true when the user confirms. */
export function confirm({
  title,
  message,
  confirmText = 'Confirm',
  destructive = false,
}: {
  title: string;
  message?: string;
  confirmText?: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(message ? `${title}\n\n${message}` : title) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
