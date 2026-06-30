import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_SESSION_STORAGE_KEY = 'critic-tourney.hasAuthSession';
const LOGIN_PHONE_STORAGE_KEY = 'critic-tourney.lastLoginPhone';

export const hasStoredAuthSession = async () => (
  await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY)
) === 'true';

export const storeAuthSession = () => AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, 'true');

export const clearStoredAuthSession = () => AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

export const getStoredLoginPhone = () => AsyncStorage.getItem(LOGIN_PHONE_STORAGE_KEY);

export const storeLoginPhone = (phoneNumber) => AsyncStorage.setItem(LOGIN_PHONE_STORAGE_KEY, phoneNumber);
