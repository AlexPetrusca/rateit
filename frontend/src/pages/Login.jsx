import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const LOGIN_PHONE_STORAGE_KEY = 'critic.loginPhoneNumber';
const LOGIN_COUNTRY_CODE_STORAGE_KEY = 'critic.loginCountryCode';
const DEFAULT_COUNTRY_CODE = '+1';
const US_LOCAL_DIGIT_COUNT = 10;

const COUNTRY_OPTIONS = [
    { code: '+1', label: 'US +1' },
    { code: '+44', label: 'UK +44' },
    { code: '+61', label: 'AU +61' },
    { code: '+91', label: 'IN +91' }
];

const sanitizeDigits = (value) => value.replace(/\D/g, '').slice(0, US_LOCAL_DIGIT_COUNT);

const formatPhoneNumber = (digitsValue) => {
    const digits = sanitizeDigits(digitsValue);
    const area = digits.slice(0, 3).padEnd(3, ' ');
    const prefix = digits.slice(3, 6).padEnd(3, ' ');
    const line = digits.slice(6, 10).padEnd(4, ' ');
    return `(${area}) ${prefix}-${line}`;
};

const normalizePhoneNumber = (countryCode, phoneNumber) => {
    const cleanedCountryCode = COUNTRY_OPTIONS.find((option) => option.code === countryCode)?.code || DEFAULT_COUNTRY_CODE;
    const digits = sanitizeDigits(phoneNumber);

    if (digits.length !== US_LOCAL_DIGIT_COUNT) {
        return '';
    }

    return `${cleanedCountryCode}${digits}`;
};

const parsePhoneInput = (rawValue, currentCountryCode) => {
    const trimmedValue = rawValue.trim();

    if (trimmedValue.startsWith('+1')) {
        return {
            countryCode: '+1',
            phoneNumber: sanitizeDigits(trimmedValue.slice(2))
        };
    }

    const digits = sanitizeDigits(trimmedValue);

    if (digits.length === 11 && digits.startsWith('1')) {
        return {
            countryCode: '+1',
            phoneNumber: digits.slice(1)
        };
    }

    return {
        countryCode: currentCountryCode,
        phoneNumber: digits
    };
};

const digitCountBeforeCaret = (formattedValue, caretIndex) => sanitizeDigits(formattedValue.slice(0, caretIndex)).length;

const caretIndexForDigitCount = (formattedValue, digitCount) => {
    if (digitCount <= 0) {
        return 0;
    }

    let seenDigits = 0;
    for (let index = 0; index < formattedValue.length; index += 1) {
        if (/\d/.test(formattedValue[index])) {
            seenDigits += 1;
            if (seenDigits >= digitCount) {
                return index + 1;
            }
        }
    }

    return formattedValue.length;
};

const Login = () => {
    const [countryCode, setCountryCode] = useState(() => localStorage.getItem(LOGIN_COUNTRY_CODE_STORAGE_KEY) || DEFAULT_COUNTRY_CODE);
    const [phoneNumber, setPhoneNumber] = useState(() => sanitizeDigits(localStorage.getItem(LOGIN_PHONE_STORAGE_KEY) || ''));
    const [verificationCode, setVerificationCode] = useState('');
    const [step, setStep] = useState('phone'); // 'phone' or 'otp'
    const [isLoading, setIsLoading] = useState(false);
    const phoneInputRef = useRef(null);
    const caretRef = useRef(null);
    const { checkAuthStatus } = useAuth();
    const { notify } = useNotifications();
    const navigate = useNavigate();

    const persistPhoneState = (nextCountryCode, nextPhoneNumber) => {
        if (nextCountryCode) {
            localStorage.setItem(LOGIN_COUNTRY_CODE_STORAGE_KEY, nextCountryCode);
        } else {
            localStorage.removeItem(LOGIN_COUNTRY_CODE_STORAGE_KEY);
        }

        if (nextPhoneNumber) {
            localStorage.setItem(LOGIN_PHONE_STORAGE_KEY, nextPhoneNumber);
        } else {
            localStorage.removeItem(LOGIN_PHONE_STORAGE_KEY);
        }
    };

    const handleCountryCodeChange = (event) => {
        const nextCountryCode = event.target.value;
        setCountryCode(nextCountryCode);
        persistPhoneState(nextCountryCode, phoneNumber);
    };

    const handlePhoneNumberChange = (event) => {
        const caretIndex = event.target.selectionStart ?? event.target.value.length;
        const digitsBeforeCaret = digitCountBeforeCaret(event.target.value, caretIndex);
        const parsed = parsePhoneInput(event.target.value, countryCode);
        setCountryCode(parsed.countryCode);
        setPhoneNumber(parsed.phoneNumber);
        persistPhoneState(parsed.countryCode, parsed.phoneNumber);
        caretRef.current = caretIndexForDigitCount(formatPhoneNumber(parsed.phoneNumber), digitsBeforeCaret);
    };

    useLayoutEffect(() => {
        if (phoneInputRef.current && caretRef.current !== null) {
            phoneInputRef.current.setSelectionRange(caretRef.current, caretRef.current);
            caretRef.current = null;
        }
    }, [phoneNumber, countryCode]);

    const handleSendOtp = async () => {
        const normalizedPhoneNumber = normalizePhoneNumber(countryCode, phoneNumber);
        if (!normalizedPhoneNumber) {
            notify({ message: 'Please enter a 10-digit phone number', type: 'warning' });
            return;
        }
        setIsLoading(true);
        try {
            await BackendApiService.sendOtp(normalizedPhoneNumber);
            setStep('otp');
        } catch (err) {
            const message = err.message || 'Network error. Please try again.';
            notify({ message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        const normalizedPhoneNumber = normalizePhoneNumber(countryCode, phoneNumber);
        if (!normalizedPhoneNumber) {
            notify({ message: 'Please enter a 10-digit phone number', type: 'warning' });
            return;
        }
        if (!verificationCode) {
            notify({ message: 'Please enter the code', type: 'warning' });
            return;
        }
        setIsLoading(true);
        try {
            await BackendApiService.verifyOtp(normalizedPhoneNumber, verificationCode);

            const user = await checkAuthStatus();

            if (!user) {
                navigate('/create-account');
            } else {
                navigate('/');
            }
        } catch (err) {
            const message = err.message || 'Network error. Please try again.';
            notify({ message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSendOtp();
        }
    };

    const handleVerificationKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleVerifyOtp();
        }
    };

    return (
        <div className="container">
            <h1>Login</h1>
            {step === 'phone' ? (
                <div className="form-group">
                    <label>Phone Number</label>
                    <div className="phone-entry-row">
                        <select
                            className="phone-country-select"
                            value={countryCode}
                            onChange={handleCountryCodeChange}
                            aria-label="Country code"
                        >
                            {COUNTRY_OPTIONS.map((option) => (
                                <option key={option.code} value={option.code}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <input
                            id="phoneNumber"
                            ref={phoneInputRef}
                            className="phone-number-input"
                            type="tel"
                            name="phoneNumber"
                            autoComplete="tel"
                            inputMode="numeric"
                            value={formatPhoneNumber(phoneNumber)}
                            onChange={handlePhoneNumberChange}
                            onKeyDown={handlePhoneKeyDown}
                            placeholder="(555) 123-4567"
                            aria-label="Phone number"
                        />
                    </div>
                    <button onClick={handleSendOtp} disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Code'}
                    </button>
                </div>
            ) : (
                <div className="form-group">
                    <label>Verification Code</label>
                    <input
                        id="verificationCode"
                        type="text"
                        name="verificationCode"
                        autoComplete="one-time-code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        onKeyDown={handleVerificationKeyDown}
                        placeholder="123456"
                    />
                    <button onClick={handleVerifyOtp} disabled={isLoading}>
                        {isLoading ? 'Verifying...' : 'Verify'}
                    </button>
                    <button className="secondary-button" onClick={() => setStep('phone')}>
                        Change Phone Number
                    </button>
                </div>
            )}
        </div>
    );
};

export default Login;
