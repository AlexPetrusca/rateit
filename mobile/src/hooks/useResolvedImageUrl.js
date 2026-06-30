import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import BackendApiService from '../services/BackendApiService.js';
import { API_BASE_URL } from '../config.js';

const resolved = new Map();  // key → url (permanent, never evicted)
const pending = new Map();   // key → Promise (deduplicate in-flight fetches)

const isAbsoluteUrl = (v) => /^https?:\/\//i.test(v);
const encodeKeyPath = (key) => key.split('/').map(encodeURIComponent).join('/');

// On web the images bucket is public and served by nginx at /images/{key} with a
// long immutable Cache-Control, so we use a stable URL directly: no presign
// round-trip, and the browser caches it permanently across scrolls and sessions.
const STABLE_WEB_URLS = Platform.OS === 'web';

const getUrl = (objectKey) => {
  if (resolved.has(objectKey)) return Promise.resolve(resolved.get(objectKey));
  if (pending.has(objectKey)) return pending.get(objectKey);
  const p = BackendApiService.getImageDownloadUrl(objectKey)
    .then((r) => { resolved.set(objectKey, r.downloadUrl); pending.delete(objectKey); return r.downloadUrl; })
    .catch(() => { pending.delete(objectKey); return null; });
  pending.set(objectKey, p);
  return p;
};

export const useResolvedImageUrl = (objectKey) => {
  const stable = !objectKey ? null
    : isAbsoluteUrl(objectKey) ? objectKey
    : STABLE_WEB_URLS ? `${API_BASE_URL}/images/${encodeKeyPath(objectKey)}`
    : (resolved.get(objectKey) ?? null);

  const [url, setUrl] = useState(stable);

  useEffect(() => {
    // Web (and absolute keys) resolve synchronously above — nothing to fetch.
    if (!objectKey || isAbsoluteUrl(objectKey) || STABLE_WEB_URLS) { setUrl(stable); return; }
    if (resolved.has(objectKey)) { setUrl(resolved.get(objectKey)); return; }
    let active = true;
    getUrl(objectKey).then((u) => { if (active && u) setUrl(u); });
    return () => { active = false; };
  }, [objectKey]);

  return url;
};
