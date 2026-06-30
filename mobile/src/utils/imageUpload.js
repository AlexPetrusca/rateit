import * as ImageManipulator from 'expo-image-manipulator';

// Phone cameras produce 3–8 MB full-resolution photos. The feed never renders
// wider than ~600px, so we downscale to a sane max and re-encode as JPEG before
// upload. This cuts payloads ~10–20x, which is the single biggest win for feed
// load time. Returns a file descriptor ready for getUploadUrl/uploadFileToS3.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

export const prepareImageForUpload = async (asset) => {
  const fallback = {
    uri: asset.uri,
    name: asset.fileName || 'rating-photo.jpg',
    type: asset.mimeType || 'image/jpeg'
  };

  try {
    // Only downscale; never enlarge a small source. Scale the longest edge to
    // MAX_DIMENSION, preserving aspect ratio.
    const longest = Math.max(asset.width || 0, asset.height || 0);
    const actions = [];
    if (longest > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / longest;
      actions.push({ resize: {
        width: Math.round((asset.width || longest) * scale),
        height: Math.round((asset.height || longest) * scale)
      } });
    }

    const result = await ImageManipulator.manipulateAsync(
      asset.uri,
      actions,
      { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    return { uri: result.uri, name: 'rating-photo.jpg', type: 'image/jpeg' };
  } catch {
    // If manipulation fails (e.g. unsupported source), fall back to the original.
    return fallback;
  }
};
