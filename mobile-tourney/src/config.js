import { Platform } from 'react-native';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const replaceLocalhostForAndroid = (url) => {
  if (Platform.OS !== 'android') return url;
  return url.replace('://localhost', '://10.0.2.2').replace('://127.0.0.1', '://10.0.2.2');
};

export const API_BASE_URL = trimTrailingSlash(
  replaceLocalhostForAndroid(process.env.EXPO_PUBLIC_API_BASE_URL || 'https://app.critic-app.com')
);

export const getApiUrl = (path) => {
  if (!path) return API_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};
