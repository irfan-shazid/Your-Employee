import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_URL, APP_SCHEME } from './config';

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: 'youremployee',
      storage: SecureStore,
    }),
  ],
});

/** Cookie header for our own API calls (native). On web the browser sends cookies itself. */
export async function getAuthCookie(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const cookie = await authClient.getCookie();
    return cookie || null;
  } catch {
    return null;
  }
}
