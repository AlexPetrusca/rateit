import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  Animated,
  AccessibilityInfo,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../components/AppButton.jsx';
import HandDrawnIcon from '../components/HandDrawnIcon.jsx';
import AppTextInput from '../components/AppTextInput.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationContext.jsx';
import BackendApiService from '../services/BackendApiService.js';
import { clearStoredLoginPhone, getStoredLoginPhone, storeLoginPhone } from '../storage/sessionStorage.js';
import { colors, spacing } from '../theme.js';
import { formatPhoneNumber, normalizePhoneNumber, parsePhoneDigits, sanitizePhoneDigits } from '../utils/loginPhone.js';
import { chooseCyclingRows } from '../utils/loginWordmark.js';

const AUTH_RETRY_DELAYS = [0, 300, 700];
const WORDMARK_CYCLE_DURATIONS = [900, 1050, 1200, 1350, 1500];
const WORDMARK_CYCLE_INTERVAL = 3500;

const COUNTRY_OPTIONS = [
  { value: '+1-us', code: '+1', country: 'United States', flag: '🇺🇸' },
  { value: '+49-de', code: '+49', country: 'Germany', flag: '🇩🇪' },
  { value: '+93-af', code: '+93', country: 'Afghanistan', flag: '🇦🇫' },
  { value: '+355-al', code: '+355', country: 'Albania', flag: '🇦🇱' },
  { value: '+213-dz', code: '+213', country: 'Algeria', flag: '🇩🇿' },
  { value: '+1684-as', code: '+1684', displayCode: '+1-684', country: 'American Samoa', flag: '🇦🇸' },
  { value: '+376-ad', code: '+376', country: 'Andorra', flag: '🇦🇩' },
  { value: '+1284-vg', code: '+1284', displayCode: '+1-284', country: 'British Virgin Islands', flag: '🇻🇬' },
  { value: '+1345-ky', code: '+1345', displayCode: '+1-345', country: 'Cayman Islands', flag: '🇰🇾' },
  { value: '+61-cx', code: '+61', country: 'Christmas Island', flag: '🇨🇽' },
  { value: '+61-cc', code: '+61', country: 'Cocos Islands', flag: '🇨🇨' },
  { value: '+682-ck', code: '+682', country: 'Cook Islands', flag: '🇨🇰' },
  { value: '+500-fk', code: '+500', country: 'Falkland Islands', flag: '🇫🇰' },
  { value: '+298-fo', code: '+298', country: 'Faroe Islands', flag: '🇫🇴' },
  { value: '+441624-im', code: '+441624', displayCode: '+44-1624', country: 'Isle of Man', flag: '🇮🇲' },
  { value: '+44-gb', code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { value: '+91-in', code: '+91', country: 'India', flag: '🇮🇳' },
  { value: '+81-jp', code: '+81', country: 'Japan', flag: '🇯🇵' },
  { value: '+52-mx', code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { value: '+33-fr', code: '+33', country: 'France', flag: '🇫🇷' },
  { value: '+39-it', code: '+39', country: 'Italy', flag: '🇮🇹' },
  { value: '+34-es', code: '+34', country: 'Spain', flag: '🇪🇸' },
  { value: '+61-au', code: '+61', country: 'Australia', flag: '🇦🇺' },
  { value: '+64-nz', code: '+64', country: 'New Zealand', flag: '🇳🇿' }
];

const WORDMARK_ROWS = [
  ['EVERYONESACRITICEVERYONESACRITICEVERYONESA'],
  ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
  ['C', 'EVERYONES', 'ACRITICEVERYONESACRITICEVERYONESA'],
  ['EVERYONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
  ['CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
  ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
  ['CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
  ['TICEVERYONESACRITICEVERYONESACRITICEVERYONESACRI'],
  ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERY'],
  ['ERYONES', 'A', 'CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
  ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
  ['RYONESA', 'CRITIC', 'EVERYONESACRITICEVERYONESACRITICEVERYONESA'],
  ['CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
  ['ACRITICEVERYONESACRITICEVERYONESACRITICEVERYONES'],
  ['VERYONESACRITICEVERYONESACRITICEVERYONESACRITICE'],
  ['EVERYONESACRITICEVERYONESACRITICEVERYONESACRITIC'],
  ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERY'],
  ['CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
  ['ITICEVERYONESACRITICEVERYONESACRITICEVERY'],
  ['EVERYONESACRITICEVERYONESACRITICEVERYONESACRITICEVE'],
  ['ACRITICEVERYONESACRITICEVERYONESACRITIC'],
  ['RYONESACRITICEVERYONESACRITICEVERY']
];

const displayCode = (country) => country.displayCode || country.code;

const LoginScreen = () => {
  const { login, checkAuthStatus } = useAuth();
  const { notify } = useNotifications();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelEntry = useRef(new Animated.Value(0)).current;
  const wordmarkAnimations = useRef(WORDMARK_ROWS.map(() => new Animated.Value(0))).current;
  const ballAnim = useRef(new Animated.Value(0)).current;
  const [fieldSize, setFieldSize] = useState({ width: 0, height: 0 });
  const lastSentPhone = useRef('');
  const lastVerifiedCode = useRef('');
  const hasEditedPhone = useRef(false);
  const [countryValue, setCountryValue] = useState('+1-us');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsAccountSetup, setNeedsAccountSetup] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wordmarkWidths, setWordmarkWidths] = useState(() => WORDMARK_ROWS.map(() => 0));
  const [enterVisible, setEnterVisible] = useState(false);

  const selectedCountry = COUNTRY_OPTIONS.find((country) => country.value === countryValue) || COUNTRY_OPTIONS[0];
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) {
      return COUNTRY_OPTIONS;
    }
    return COUNTRY_OPTIONS.filter((country) => (
      country.country.toLowerCase().includes(query)
      || country.code.includes(query)
      || displayCode(country).includes(query)
    ));
  }, [countrySearch]);

  useEffect(() => {
    getStoredLoginPhone().then((storedPhone) => {
      if (!storedPhone) {
        return;
      }
      const country = [...COUNTRY_OPTIONS]
        .sort((a, b) => b.code.length - a.code.length)
        .find((option) => storedPhone.startsWith(option.code));
      if (country) {
        setCountryValue(country.value);
        setPhoneDigits(sanitizePhoneDigits(storedPhone.slice(country.code.length)));
      }
    });
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      panelEntry.setValue(1);
      return undefined;
    }
    Animated.timing(panelEntry, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true
    }).start();
    return undefined;
  }, [panelEntry, reduceMotion]);

  useEffect(() => {
    if (isLoading && step === 'phone') {
      Animated.loop(
        Animated.timing(ballAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: false
        })
      ).start();
    } else {
      ballAnim.stopAnimation();
      ballAnim.setValue(0);
    }
  }, [isLoading, step, ballAnim]);

  useEffect(() => {
    const lastRowIndex = WORDMARK_ROWS.length - 2;

    if (reduceMotion) {
      wordmarkAnimations.forEach((animation) => {
        animation.stopAnimation();
        animation.setValue(0);
      });
      setEnterVisible(true);
      return undefined;
    }

    const bottomAnim = wordmarkAnimations[lastRowIndex];
    const spinTimer = setTimeout(() => {
      bottomAnim.setValue(0);
      Animated.timing(bottomAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true
      }).start();
    }, 1500);
    const enterTimer = setTimeout(() => setEnterVisible(true), 1600);

    const cycleRows = () => {
      // Exclude the ENTER row so it stays visible
      chooseCyclingRows(WORDMARK_ROWS.length).filter(i => i !== lastRowIndex).forEach((rowIndex, sequenceIndex) => {
        const animation = wordmarkAnimations[rowIndex];
        animation.setValue(0);
        Animated.timing(animation, {
          toValue: 1,
          duration: WORDMARK_CYCLE_DURATIONS[rowIndex % WORDMARK_CYCLE_DURATIONS.length],
          delay: sequenceIndex * 70,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true
        }).start();
      });
    };

    const interval = setInterval(cycleRows, WORDMARK_CYCLE_INTERVAL);
    return () => { clearTimeout(spinTimer); clearTimeout(enterTimer); clearInterval(interval); };
  }, [reduceMotion, wordmarkAnimations]);

  const resolveAuthAfterVerification = useCallback(async () => {
    for (const delay of AUTH_RETRY_DELAYS) {
      if (delay) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      const userData = await checkAuthStatus();
      if (userData) {
        return userData;
      }
    }
    return null;
  }, [checkAuthStatus]);

  const sendOtp = useCallback(async () => {
    const normalized = normalizePhoneNumber(selectedCountry.code, phoneDigits);
    if (!normalized) {
      setError('Please enter a 10-digit phone number');
      return;
    }

    lastSentPhone.current = normalized;
    setIsLoading(true);
    setError('');
    try {
      await BackendApiService.sendOtp(normalized);
      await storeLoginPhone(normalized);
      setStep('otp');
      notify({ message: 'Verification code sent.', type: 'info' });
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [notify, phoneDigits, selectedCountry.code]);

  useEffect(() => {
    if (!hasEditedPhone.current || phoneDigits.length !== 10) return;
    sendOtp();
  }, [phoneDigits, sendOtp]);

  const verifyOtp = useCallback(async () => {
    const normalized = normalizePhoneNumber(selectedCountry.code, phoneDigits);
    if (!normalized || code.length !== 6) {
      setError('Please enter the six-digit code');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await BackendApiService.verifyOtp(normalized, code);
      const userData = await resolveAuthAfterVerification();
      if (userData) {
        await clearStoredLoginPhone();
        await login(userData);
      } else {
        setNeedsAccountSetup(true);
      }
    } catch (err) {
      setError(err.message || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  }, [code, login, phoneDigits, resolveAuthAfterVerification, selectedCountry.code]);

  useEffect(() => {
    const normalized = normalizePhoneNumber(selectedCountry.code, phoneDigits);
    if (step !== 'phone' || isLoading || !hasEditedPhone.current || !normalized || normalized === lastSentPhone.current) {
      return undefined;
    }
    const timer = setTimeout(sendOtp, 350);
    return () => clearTimeout(timer);
  }, [isLoading, phoneDigits, selectedCountry.code, sendOtp, step]);

  useEffect(() => {
    if (step !== 'otp' || needsAccountSetup || isLoading || code.length !== 6 || code === lastVerifiedCode.current) {
      return undefined;
    }
    const timer = setTimeout(() => {
      lastVerifiedCode.current = code;
      verifyOtp();
    }, 350);
    return () => clearTimeout(timer);
  }, [code, isLoading, needsAccountSetup, step, verifyOtp]);

  const pickImage = async (camera = false) => {
    const launcher = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launcher({
      mediaTypes: ['images'],
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
      setError('Please enter a username');
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

  const changePhone = () => {
    setCode('');
    setError('');
    setNeedsAccountSetup(false);
    lastVerifiedCode.current = '';
    setStep('phone');
  };

  const panelWidth = Math.min(needsAccountSetup ? 360 : 246, width - 28);
  const panelTop = needsAccountSetup ? height * 0.17 : height * 0.22;
  const wordmarkSize = Math.max(32, Math.min(52, width * 0.115));
  const status = error || (isLoading ? (needsAccountSetup ? 'Saving profile' : step === 'phone' ? 'Sending code' : 'Verifying') : '');

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={[styles.wordmark, { bottom: insets.bottom }]}>
        {WORDMARK_ROWS.map((row, rowIndex) => {
          const isLastRow = rowIndex === WORDMARK_ROWS.length - 2;
          return (
            <View
              key={`${row.join('-')}-${rowIndex}`}
              style={[styles.wordmarkRowViewport, { height: wordmarkSize * 0.9 }]}
            >
              <Animated.View
                style={[
                  styles.wordmarkTrack,
                  {
                    transform: [{
                      translateX: wordmarkAnimations[rowIndex].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-wordmarkWidths[rowIndex], 0]
                      })
                    }]
                  }
                ]}
              >
                {[0, 1].map((copyIndex) => (
                  <Text
                    key={copyIndex}
                    onLayout={copyIndex === 0 ? ({ nativeEvent }) => {
                      const nextWidth = nativeEvent.layout.width;
                      setWordmarkWidths((current) => {
                        if (current[rowIndex] === nextWidth) {
                          return current;
                        }
                        const next = [...current];
                        next[rowIndex] = nextWidth;
                        return next;
                      });
                    } : undefined}
                    style={[
                      styles.wordmarkRow,
                      { fontSize: wordmarkSize, lineHeight: wordmarkSize * 0.9 }
                    ]}
                  >
                    {row.map((segment, segmentIndex) => {
                      const accented = segmentIndex === 1 && (!isLastRow || enterVisible);
                      return (
                        <Text key={`${segment}-${segmentIndex}`} style={accented ? styles.wordmarkAccent : null}>
                          {segment}
                        </Text>
                      );
                    })}
                  </Text>
                ))}
              </Animated.View>
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Animated.View
          style={[
            styles.panel,
            { top: panelTop, width: panelWidth },
            {
              opacity: panelEntry,
              transform: [{
                translateY: panelEntry.interpolate({ inputRange: [0, 1], outputRange: [18, 0] })
              }]
            }
          ]}
        >
          {needsAccountSetup ? (
            <View style={styles.accountPanel}>
              <Text style={styles.fieldLabel}>Username</Text>
              <AppTextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                autoCapitalize="none"
                inputStyle={styles.accountInput}
              />
              <Text style={styles.fieldLabel}>Profile picture</Text>
              <View style={styles.accountPhotoRow}>
                <AppButton
                  variant="secondary"
                  label="Take photo"
                  icon={<HandDrawnIcon name="camera" color="#111827" />}
                  onPress={() => pickImage(true)}
                  style={[styles.accountSecondaryButton, styles.accountPhotoButton]}
                />
                <AppButton
                  variant="secondary"
                  label="Upload photo"
                  icon={<HandDrawnIcon name="upload" color="#111827" />}
                  onPress={() => pickImage(false)}
                  style={[styles.accountSecondaryButton, styles.accountPhotoButton]}
                />
              </View>
              {selectedImage ? (
                <>
                  <Text style={styles.fileName}>{selectedImage.name}</Text>
                  <Image source={{ uri: selectedImage.uri }} style={styles.preview} />
                </>
              ) : null}
              <AppButton
                label="Continue"
                onPress={saveAccount}
                loading={isLoading}
                style={styles.accountPrimaryButton}
                textStyle={styles.accountLightText}
              />
            </View>
          ) : step === 'phone' ? (
            <>
              <View
                style={styles.phoneFieldWrap}
                onLayout={({ nativeEvent }) => setFieldSize({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })}
              >
                <View style={[styles.phoneField, isLoading && styles.phoneFieldActive]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Country code, ${selectedCountry.country} ${displayCode(selectedCountry)}`}
                    onPress={() => setCountryPickerOpen(true)}
                    style={({ pressed }) => [styles.countryButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.flag}>{selectedCountry.flag}</Text>
                  </Pressable>
                  <Text style={styles.prefix}>{displayCode(selectedCountry)}</Text>
                  <TextInput
                    accessibilityLabel="Phone number"
                    autoFocus
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    keyboardType="phone-pad"
                    value={formatPhoneNumber(phoneDigits)}
                    onChangeText={(value) => {
                      hasEditedPhone.current = true;
                      setPhoneDigits(parsePhoneDigits(value));
                      setError('');
                    }}
                    onSubmitEditing={sendOtp}
                    placeholder="(___) ___-____"
                    placeholderTextColor="#9ca3af"
                    selectionColor={colors.accent}
                    style={styles.phoneInput}
                  />
                </View>
                {isLoading && fieldSize.width > 0 && (() => {
                  const BALL = 9;
                  const { width: fw, height: fh } = fieldSize;
                  const P = 2 * (fw + fh);
                  const bp = [0, fw / P, (fw + fh) / P, (2 * fw + fh) / P, 1];
                  const ballLeft = ballAnim.interpolate({ inputRange: bp, outputRange: [-BALL / 2, fw - BALL / 2, fw - BALL / 2, -BALL / 2, -BALL / 2] });
                  const ballTop = ballAnim.interpolate({ inputRange: bp, outputRange: [-BALL / 2, -BALL / 2, fh - BALL / 2, fh - BALL / 2, -BALL / 2] });
                  return <Animated.View style={[styles.ball, { width: BALL, height: BALL, borderRadius: BALL / 2, left: ballLeft, top: ballTop }]} />;
                })()}
              </View>
            </>
          ) : (
            <>
              <View style={[styles.phoneField, styles.codeField]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change Phone Number"
                  onPress={changePhone}
                  style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                >
                  <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <TextInput
                  accessibilityLabel="Verification code"
                  autoFocus
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={(value) => {
                    setCode(value.replace(/\D/g, '').slice(0, 6));
                    setError('');
                  }}
                  onSubmitEditing={verifyOtp}
                  placeholder="123456"
                  placeholderTextColor="#9ca3af"
                  selectionColor={colors.accent}
                  style={styles.codeInput}
                />
                <View style={styles.codeUnderline} />
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      {status ? <Text style={[styles.status, { bottom: insets.bottom + 14 }]}>{status}</Text> : null}

      <Modal
        animationType="fade"
        transparent
        visible={countryPickerOpen}
        onRequestClose={() => setCountryPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCountryPickerOpen(false)}>
          <Pressable accessibilityRole="none" style={styles.countryMenu} onPress={(event) => event.stopPropagation()}>
            <TextInput
              autoFocus
              accessibilityLabel="Search for a country"
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder="Search for a country"
              placeholderTextColor="#9ca3af"
              selectionColor={colors.accent}
              style={styles.countrySearch}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(country) => country.value}
              keyboardShouldPersistTaps="handled"
              style={styles.countryList}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setCountryValue(item.value);
                    setCountrySearch('');
                    setCountryPickerOpen(false);
                  }}
                  style={({ pressed }) => [styles.countryOption, pressed && styles.countryOptionPressed]}
                >
                  <Text style={styles.optionFlag}>{item.flag}</Text>
                  <Text numberOfLines={1} style={styles.optionName}>{item.country}</Text>
                  <Text style={styles.optionCode}>{displayCode(item)}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#ffffff'
  },
  wordmark: {
    position: 'absolute',
    top: -8,
    right: -260,
    left: -8,
    justifyContent: 'space-between'
  },
  wordmarkRow: {
    flexShrink: 0,
    color: '#111827',
    fontFamily: 'Gelasio_400Regular',
    fontWeight: '400',
    letterSpacing: -1.4
  },
  wordmarkRowViewport: {
    flexShrink: 0
  },
  wordmarkTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start'
  },
  wordmarkAccent: {
    color: colors.accent
  },
  overlay: {
    flex: 1,
    alignItems: 'center'
  },
  panel: {
    position: 'absolute',
    zIndex: 2,
    gap: 6,
    ...Platform.select({
      web: { filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.34))' },
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.34,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 16 }
      },
      android: { elevation: 8 }
    })
  },
  phoneFieldWrap: {
    position: 'relative'
  },
  phoneField: {
    minHeight: 54,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff'
  },
  phoneFieldActive: {
    borderColor: '#111827'
  },
  ball: {
    position: 'absolute',
    backgroundColor: '#111827'
  },
  countryButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6
  },
  flag: {
    fontSize: 18
  },
  prefix: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700'
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    outlineStyle: 'none'
  },
  backButton: {
    position: 'absolute',
    left: 10,
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  backArrow: {
    color: '#111827',
    fontSize: 20,
    lineHeight: 24
  },
  pressed: {
    opacity: 0.75
  },
  codeField: {
    justifyContent: 'center'
  },
  codeInput: {
    flex: 1,
    width: '100%',
    paddingVertical: 0,
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 5,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    outlineStyle: 'none'
  },
  codeUnderline: {
    position: 'absolute',
    left: '50%',
    bottom: 8,
    width: 70,
    height: 2,
    marginLeft: -35,
    borderRadius: 999,
    backgroundColor: colors.accent
  },
  accountPanel: {
    padding: 18,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff'
  },
  fieldLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600'
  },
  fileName: {
    color: '#6b7280',
    fontSize: 13
  },
  preview: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#f3f4f6'
  },
  accountInput: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    color: '#111827'
  },
  accountSecondaryButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db'
  },
  accountPhotoRow: {
    flexDirection: 'row',
    gap: spacing.md
  },
  accountPhotoButton: {
    width: 72,
    height: 72,
    borderRadius: 20,
    paddingHorizontal: 0
  },
  accountDarkText: {
    color: '#111827'
  },
  accountPrimaryButton: {
    backgroundColor: '#111827',
    borderColor: '#111827'
  },
  accountLightText: {
    color: '#ffffff'
  },
  status: {
    position: 'absolute',
    left: 16,
    zIndex: 3,
    color: colors.accent,
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  modalBackdrop: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.62)'
  },
  countryMenu: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#ffffff'
  },
  countrySearch: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    color: '#111827',
    outlineStyle: 'none'
  },
  countryList: {
    flexGrow: 0
  },
  countryOption: {
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  countryOptionPressed: {
    backgroundColor: colors.surfacePressed
  },
  optionFlag: {
    width: 24,
    fontSize: 17
  },
  optionName: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    fontWeight: '700'
  },
  optionCode: {
    color: '#6b7280',
    fontSize: 13
  }
});

export default LoginScreen;
