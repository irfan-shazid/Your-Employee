import Constants from 'expo-constants';

/**
 * Base URL of the API server. Set EXPO_PUBLIC_API_URL in mobile/.env
 * (use your computer's LAN IP when testing on a phone, e.g. http://192.168.0.105:4000).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export const APP_SCHEME = (Constants.expoConfig?.scheme as string | undefined) ?? 'youremployee';

/** Server stores uploaded images as "/api/media/<id>". Google avatars are absolute URLs. */
export function resolveImageUrl(url?: string | null) {
  if (!url) return undefined;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}
