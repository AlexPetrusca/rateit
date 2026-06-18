import { useEffect, useState } from 'react';
import BackendApiService from '../services/BackendApiService.js';

const cache = new Map();

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

export const useResolvedImageUrl = (objectKey) => {
  const [url, setUrl] = useState(() => {
    if (!objectKey) {
      return null;
    }
    return cache.get(objectKey) || (isAbsoluteUrl(objectKey) ? objectKey : null);
  });

  useEffect(() => {
    let isMounted = true;

    if (!objectKey) {
      setUrl(null);
      return () => {
        isMounted = false;
      };
    }

    if (isAbsoluteUrl(objectKey)) {
      cache.set(objectKey, objectKey);
      setUrl(objectKey);
      return () => {
        isMounted = false;
      };
    }

    const cachedUrl = cache.get(objectKey);
    if (cachedUrl) {
      setUrl(cachedUrl);
      return () => {
        isMounted = false;
      };
    }

    BackendApiService.getImageDownloadUrl(objectKey)
      .then((response) => {
        if (!isMounted) {
          return;
        }
        cache.set(objectKey, response.downloadUrl);
        setUrl(response.downloadUrl);
      })
      .catch(() => {
        if (isMounted) {
          setUrl(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [objectKey]);

  return url;
};
