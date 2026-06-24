import { Platform } from 'react-native';
import { resolveEmulatorLoopback } from './utils/network.js';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

// The production web build is served behind nginx (which proxies /api and /auth
// to the backend), so it always talks to its own origin. Force same-origin here
// and ignore EXPO_PUBLIC_API_BASE_URL: that var is set to localhost in .env for
// dev, and letting it through baked localhost into prod builds. Native and local
// dev keep using the env var / localhost fallback.
const webOrigin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
const isProdWeb = Platform.OS === 'web' && process.env.NODE_ENV === 'production';

export const API_BASE_URL = trimTrailingSlash(
  isProdWeb && webOrigin
    ? webOrigin
    : resolveEmulatorLoopback(process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080', Platform.OS)
);

export const APP_PUBLIC_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_APP_PUBLIC_URL || (
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:3002'
  )
);

export const getRatingShareUrl = (rateableItemId, ratingId) => (
  `${APP_PUBLIC_URL}/topics/${encodeURIComponent(rateableItemId)}?openReviewId=${encodeURIComponent(ratingId)}`
);

export const getApiUrl = (path) => {
  if (!path) {
    return API_BASE_URL;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};
