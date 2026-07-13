import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { AVATAR_MAX_DIMENSION, JPEG_QUALITY, MAX_DIMENSION, computeTargetSize } from './imageScaling.js';

// Phone cameras produce 3–8 MB full-resolution photos. The feed never renders
// wider than ~600px and avatars never wider than ~64px, so we downscale and
// re-encode as JPEG before upload. Returns a file descriptor ready for
// getUploadUrl/uploadFileToS3.
//
// This must never silently upload the original. It used to: when the resize
// threw, it fell back to the untouched asset, which is how multi-megabyte camera
// originals ended up as profile pictures. Rendering ~18 of those at once in the
// tourney player picker decoded to enough bitmap (~160 MB) to get the tab killed
// by mobile Safari. Failing loudly is better than shipping a 5 MB avatar.
export { AVATAR_MAX_DIMENSION, MAX_DIMENSION };

// expo-image-manipulator is unreliable on web (it is where the silent fallback
// kept triggering), so the web build resizes with a canvas instead.
const resizeOnWeb = async (uri, maxDimension) => {
  const blob = await fetch(uri).then((response) => response.blob());
  const bitmap = await createImageBitmap(blob);
  const target = computeTargetSize(bitmap.width, bitmap.height, maxDimension)
    || { width: bitmap.width, height: bitmap.height };

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, target.width, target.height);
  bitmap.close?.();

  const encoded = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });
  if (!encoded) {
    throw new Error('Could not encode image');
  }

  return URL.createObjectURL(encoded);
};

const resizeOnNative = async (asset, maxDimension) => {
  const target = computeTargetSize(asset.width, asset.height, maxDimension);
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    target ? [{ resize: target }] : [],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
};

export const prepareImageForUpload = async (asset, options = {}) => {
  const { maxDimension = MAX_DIMENSION, name = 'rating-photo.jpg' } = options;

  try {
    const uri = Platform.OS === 'web'
      ? await resizeOnWeb(asset.uri, maxDimension)
      : await resizeOnNative(asset, maxDimension);
    return { uri, name, type: 'image/jpeg' };
  } catch (cause) {
    throw new Error('Could not process that image. Try a different photo.', { cause });
  }
};
