import { Platform } from 'react-native';
import { resolveEmulatorLoopback } from './utils/network.js';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(
  resolveEmulatorLoopback(process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080', Platform.OS)
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
