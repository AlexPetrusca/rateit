import AsyncStorage from '@react-native-async-storage/async-storage';

// Per-user record of which prompt ids this device has already shown. Replaces the
// old 24h expiry: a prompt stays "new" until the user actually views it.
// ponytail: device-local; add a backend table if cross-device sync is needed.
const key = (userId) => `seenPrompts:${userId ?? 'anon'}`;

export const getSeenPromptIds = async (userId) => {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const markPromptSeen = async (userId, promptId) => {
  const id = String(promptId);
  const seen = await getSeenPromptIds(userId);
  if (seen.has(id)) return;
  seen.add(id);
  await AsyncStorage.setItem(key(userId), JSON.stringify([...seen]));
};
