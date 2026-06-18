import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import Card from '../components/Card.jsx';
import Screen from '../components/Screen.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { clearStoredLoginPhone, getStoredLoginPhone, storeLoginPhone } from '../storage/sessionStorage.js';
import { colors, spacing, text } from '../theme.js';

const normalizePhone = (value) => value.replace(/[^\d+]/g, '');

const LoginScreen = () => {
  const { login, checkAuthStatus } = useAuth();
  const { notify } = useNotifications();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsAccountSetup, setNeedsAccountSetup] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    getStoredLoginPhone().then((storedPhone) => {
      if (storedPhone) {
        setPhoneNumber(storedPhone);
      }
    });
  }, []);

  const sendOtp = async () => {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized) {
      setError('Enter a phone number.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await BackendApiService.sendOtp(normalized);
      await storeLoginPhone(normalized);
      setPhoneNumber(normalized);
      setStep('otp');
      notify({ message: 'Verification code sent.', type: 'info' });
    } catch (err) {
      setError(err.message || 'Failed to send code');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!code.trim()) {
      setError('Enter the verification code.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await BackendApiService.verifyOtp(phoneNumber, code.trim());
      const userData = await checkAuthStatus();
      if (userData) {
        await login(userData);
      } else {
        setNeedsAccountSetup(true);
      }
    } catch (err) {
      setError(err.message || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        name: asset.fileName || 'profile.jpg',
        type: asset.mimeType || 'image/jpeg'
      });
    }
  };

  const saveAccount = async () => {
    const nextUsername = username.trim();
    if (!nextUsername) {
      setError('Choose a username.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      let profilePicUrl = null;
      if (selectedImage) {
        const { uploadUrl, key } = await BackendApiService.getUploadUrl(selectedImage.name, selectedImage.type);
        await BackendApiService.uploadFileToS3(uploadUrl, selectedImage);
        profilePicUrl = key;
      }
      const userData = await BackendApiService.createOrUpdateUser({ username: nextUsername, profilePicUrl });
      await clearStoredLoginPhone();
      await login(userData);
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.brand}>
        <Text style={styles.brandText}>EVERYONES</Text>
        <Text style={[styles.brandText, styles.brandAccent]}>A CRITIC</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.title}>{needsAccountSetup ? 'Create profile' : 'Log in'}</Text>
        <StatusMessage message={error} type="error" />

        {needsAccountSetup ? (
          <>
            <AppTextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="critic_name"
              autoCapitalize="none"
            />
            <AppButton variant="secondary" label={selectedImage ? 'Change profile photo' : 'Choose profile photo'} onPress={pickImage} />
            {selectedImage ? <Text style={styles.fileName}>{selectedImage.name}</Text> : null}
            <AppButton label="Finish setup" onPress={saveAccount} loading={isLoading} />
          </>
        ) : step === 'phone' ? (
          <>
            <AppTextInput
              label="Phone"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+15555551212"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <AppButton label="Send code" onPress={sendOtp} loading={isLoading} />
          </>
        ) : (
          <>
            <AppTextInput
              label="Verification code"
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            <AppButton label="Verify" onPress={verifyOtp} loading={isLoading} />
            <AppButton variant="ghost" label="Use a different phone" onPress={() => setStep('phone')} />
          </>
        )}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center'
  },
  brand: {
    gap: spacing.xs
  },
  brandText: {
    fontSize: 46,
    lineHeight: 48,
    fontWeight: '900',
    letterSpacing: 0,
    color: colors.text
  },
  brandAccent: {
    color: colors.accent
  },
  card: {
    gap: spacing.md
  },
  title: text.h2,
  fileName: {
    ...text.muted
  }
});

export default LoginScreen;
