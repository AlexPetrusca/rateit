import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext.jsx';
import TourneyApiService from '../services/TourneyApiService.js';
import { getStoredLoginPhone, storeLoginPhone } from '../storage/sessionStorage.js';
import { colors, radius, spacing } from '../theme.js';

const normalizePhone = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
};

const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { login, checkAuthStatus } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getStoredLoginPhone().then((storedPhone) => {
      if (storedPhone) setPhoneNumber(storedPhone);
    });
  }, []);

  const sendCode = async () => {
    const normalized = normalizePhone(phoneNumber);
    setError('');
    setIsLoading(true);
    try {
      await TourneyApiService.sendOtp(normalized);
      await storeLoginPhone(normalized);
      setPhoneNumber(normalized);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    const normalized = normalizePhone(phoneNumber);
    setError('');
    setIsLoading(true);
    try {
      await TourneyApiService.verifyOtp(normalized, code.trim());
      const userData = await checkAuthStatus();
      if (!userData) {
        setError('This phone is signed in, but it does not have a Critic profile yet.');
        return;
      }
      await login(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Spikeball ops</Text>
        <Text style={styles.title}>Tourney</Text>
        <Text style={styles.subtitle}>Sign in with the same Critic account you use on app.critic-app.com.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="+15551234567"
          placeholderTextColor={colors.textSubtle}
          keyboardType="phone-pad"
          autoComplete="tel"
          style={styles.input}
          editable={!isLoading}
        />

        {step === 'code' ? (
          <>
            <Text style={styles.label}>Code</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={colors.textSubtle}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              style={styles.input}
              editable={!isLoading}
            />
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={step === 'phone' ? sendCode : verifyCode}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{step === 'phone' ? 'Send code' : 'Sign in'}</Text>
          )}
        </Pressable>

        {step === 'code' ? (
          <Pressable style={styles.textButton} onPress={() => setStep('phone')} disabled={isLoading}>
            <Text style={styles.textButtonText}>Change phone</Text>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background
  },
  header: {
    gap: spacing.sm
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  title: {
    color: colors.text,
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23
  },
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 17
  },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.accent
  },
  primaryButtonPressed: {
    backgroundColor: colors.accentPressed
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm
  },
  textButtonText: {
    color: colors.textMuted,
    fontWeight: '700'
  },
  error: {
    color: colors.danger,
    lineHeight: 20
  }
});

export default LoginScreen;
