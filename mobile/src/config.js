const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080'
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
