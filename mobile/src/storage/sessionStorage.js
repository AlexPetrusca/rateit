import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_SESSION_STORAGE_KEY = 'critic.hasAuthSession';
const LOGIN_PHONE_STORAGE_KEY = 'critic.loginPhone';

export const hasStoredAuthSession = async () => (
  await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY)
) === 'true';

export const storeAuthSession = () => AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, 'true');

export const clearStoredAuthSession = () => AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

export const getStoredLoginPhone = async () => (
  await AsyncStorage.getItem(LOGIN_PHONE_STORAGE_KEY)
) || '';

export const storeLoginPhone = (phoneNumber) => AsyncStorage.setItem(LOGIN_PHONE_STORAGE_KEY, phoneNumber);

export const clearStoredLoginPhone = () => AsyncStorage.removeItem(LOGIN_PHONE_STORAGE_KEY);
