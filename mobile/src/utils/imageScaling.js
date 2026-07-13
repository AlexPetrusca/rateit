// Pure sizing math for image uploads, kept free of react-native imports so it
// can be unit tested under `node --test`.

export const MAX_DIMENSION = 1600;
export const AVATAR_MAX_DIMENSION = 512;
export const JPEG_QUALITY = 0.7;

// Scale the longest edge down to maxDimension, preserving aspect ratio. Returns
// null when no resize is needed: only ever downscales, never enlarges a source
// that is already under the cap.
export const computeTargetSize = (width, height, maxDimension) => {
  const longest = Math.max(width || 0, height || 0);
  if (!longest || !maxDimension || longest <= maxDimension) {
    return null;
  }

  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round((width || longest) * scale)),
    height: Math.max(1, Math.round((height || longest) * scale))
  };
};
