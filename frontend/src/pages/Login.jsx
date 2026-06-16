import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
    { value: '+1-us', code: '+1', country: 'United States', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
    { value: '+49-de', code: '+49', country: 'Germany', flag: '\uD83C\uDDE9\uD83C\uDDEA' },
    { value: '+93-af', code: '+93', country: 'Afghanistan', flag: '\uD83C\uDDE6\uD83C\uDDEB' },
    { value: '+355-al', code: '+355', country: 'Albania', flag: '\uD83C\uDDE6\uD83C\uDDF1' },
    { value: '+213-dz', code: '+213', country: 'Algeria', flag: '\uD83C\uDDE9\uD83C\uDDFF' },
    { value: '+1684-as', code: '+1684', displayCode: '+1-684', country: 'American Samoa', flag: '\uD83C\uDDE6\uD83C\uDDF8' },
    { value: '+376-ad', code: '+376', country: 'Andorra', flag: '\uD83C\uDDE6\uD83C\uDDE9' },
    { value: '+1284-vg', code: '+1284', displayCode: '+1-284', country: 'British Virgin Islands', flag: '\uD83C\uDDFB\uD83C\uDDEC' },
    { value: '+1345-ky', code: '+1345', displayCode: '+1-345', country: 'Cayman Islands', flag: '\uD83C\uDDF0\uD83C\uDDFE' },
    { value: '+61-cx', code: '+61', country: 'Christmas Island', flag: '\uD83C\uDDE8\uD83C\uDDFD' },
    { value: '+61-cc', code: '+61', country: 'Cocos Islands', flag: '\uD83C\uDDE8\uD83C\uDDE8' },
    { value: '+682-ck', code: '+682', country: 'Cook Islands', flag: '\uD83C\uDDE8\uD83C\uDDF0' },
    { value: '+500-fk', code: '+500', country: 'Falkland Islands', flag: '\uD83C\uDDEB\uD83C\uDDF0' },
    { value: '+298-fo', code: '+298', country: 'Faroe Islands', flag: '\uD83C\uDDEB\uD83C\uDDF4' },
    { value: '+441624-im', code: '+441624', displayCode: '+44-1624', country: 'Isle of Man', flag: '\uD83C\uDDEE\uD83C\uDDF2' },
    { value: '+44-gb', code: '+44', country: 'United Kingdom', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
    { value: '+91-in', code: '+91', country: 'India', flag: '\uD83C\uDDEE\uD83C\uDDF3' },
    { value: '+81-jp', code: '+81', country: 'Japan', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
    { value: '+52-mx', code: '+52', country: 'Mexico', flag: '\uD83C\uDDF2\uD83C\uDDFD' },
    { value: '+33-fr', code: '+33', country: 'France', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
    { value: '+39-it', code: '+39', country: 'Italy', flag: '\uD83C\uDDEE\uD83C\uDDF9' },
    { value: '+34-es', code: '+34', country: 'Spain', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
    { value: '+61-au', code: '+61', country: 'Australia', flag: '\uD83C\uDDE6\uD83C\uDDFA' },
    { value: '+64-nz', code: '+64', country: 'New Zealand', flag: '\uD83C\uDDF3\uD83C\uDDFF' }
];

const CRITIC_TEXT_ROWS = [
    ['EVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['C','EVERYONES', 'ACRITICEVERYONESACRITICEVERYONESA'],
    ['EVERYONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['ERYONES', 'A', 'CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['RYONESA', 'CRITIC', 'EVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['EVERYONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['EVERYONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['CRITICEVERYONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],
    ['ONESACRITICEVERYONESACRITICEVERYONESACRITICEVERYONESA'],

];

const sanitizeDigits = (value) => value.replace(/\D/g, '').slice(0, US_LOCAL_DIGIT_COUNT);

const getCountryDisplayCode = (option) => option?.displayCode || option?.code || DEFAULT_COUNTRY_CODE;
const getCountryValue = (option) => option?.value || option?.code || DEFAULT_COUNTRY_CODE;

const formatPhoneNumber = (digitsValue) => {
    const digits = sanitizeDigits(digitsValue);
    const area = digits.slice(0, 3).padEnd(3, ' ');
    const prefix = digits.slice(3, 6).padEnd(3, ' ');
    const line = digits.slice(6, 10).padEnd(4, ' ');
    return `(${area}) ${prefix}-${line}`;
};

const normalizePhoneNumber = (countryCode, phoneNumber) => {
    const cleanedCountryCode = COUNTRY_OPTIONS.find((option) => (
        getCountryValue(option) === countryCode || option.code === countryCode
    ))?.code || DEFAULT_COUNTRY_CODE;
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
            countryCode: '+1-us',
            phoneNumber: sanitizeDigits(trimmedValue.slice(2))
        };
    }

    const digits = sanitizeDigits(trimmedValue);

    if (digits.length === 11 && digits.startsWith('1')) {
        return {
            countryCode: '+1-us',
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
    const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const phoneInputRef = useRef(null);
    const countryMenuRef = useRef(null);
    const caretRef = useRef(null);
    const hasEditedPhoneRef = useRef(false);
    const lastSentPhoneRef = useRef('');
    const { checkAuthStatus } = useAuth();
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const selectedCountry = COUNTRY_OPTIONS.find((option) => (
        getCountryValue(option) === countryCode || option.code === countryCode
    )) || COUNTRY_OPTIONS[0];
    const filteredCountryOptions = COUNTRY_OPTIONS.filter((option) => {
        const query = countrySearch.trim().toLowerCase();

        if (!query) {
            return true;
        }

        return option.country.toLowerCase().includes(query)
            || option.code.includes(query)
            || getCountryDisplayCode(option).includes(query);
    });

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

    const handleCountryCodeSelect = (nextCountry) => {
        const nextCountryCode = getCountryValue(nextCountry);
        setCountryCode(nextCountryCode);
        persistPhoneState(nextCountryCode, phoneNumber);
        setCountrySearch('');
        setIsCountryMenuOpen(false);
        window.setTimeout(() => phoneInputRef.current?.focus(), 0);
    };

    const handlePhoneNumberChange = (event) => {
        const caretIndex = event.target.selectionStart ?? event.target.value.length;
        const digitsBeforeCaret = digitCountBeforeCaret(event.target.value, caretIndex);
        const parsed = parsePhoneInput(event.target.value, countryCode);
        hasEditedPhoneRef.current = true;
        setCountryCode(parsed.countryCode);
        setPhoneNumber(parsed.phoneNumber);
        persistPhoneState(parsed.countryCode, parsed.phoneNumber);
        caretRef.current = caretIndexForDigitCount(formatPhoneNumber(parsed.phoneNumber), digitsBeforeCaret);
    };

    const handlePhoneSelectionDelete = (event) => {
        const input = event.currentTarget;
        const selectionStart = input.selectionStart ?? 0;
        const selectionEnd = input.selectionEnd ?? selectionStart;

        if (selectionStart === selectionEnd) {
            return false;
        }

        const firstSelectedDigit = digitCountBeforeCaret(input.value, selectionStart);
        const lastSelectedDigit = digitCountBeforeCaret(input.value, selectionEnd);

        if (firstSelectedDigit === lastSelectedDigit) {
            return false;
        }

        event.preventDefault();
        const nextPhoneNumber = `${phoneNumber.slice(0, firstSelectedDigit)}${phoneNumber.slice(lastSelectedDigit)}`;
        hasEditedPhoneRef.current = true;
        setPhoneNumber(nextPhoneNumber);
        persistPhoneState(countryCode, nextPhoneNumber);
        caretRef.current = caretIndexForDigitCount(formatPhoneNumber(nextPhoneNumber), firstSelectedDigit);
        return true;
    };

    useLayoutEffect(() => {
        if (phoneInputRef.current && caretRef.current !== null) {
            phoneInputRef.current.setSelectionRange(caretRef.current, caretRef.current);
            caretRef.current = null;
        }
    }, [phoneNumber, countryCode]);

    useEffect(() => {
        if (!isCountryMenuOpen) {
            return undefined;
        }

        const handlePointerDown = (event) => {
            if (countryMenuRef.current && !countryMenuRef.current.contains(event.target)) {
                setIsCountryMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [isCountryMenuOpen]);

    const handleSendOtp = async () => {
        const normalizedPhoneNumber = normalizePhoneNumber(countryCode, phoneNumber);
        if (!normalizedPhoneNumber) {
            notify({ message: 'Please enter a 10-digit phone number', type: 'warning' });
            return;
        }
        setIsLoading(true);
        try {
            lastSentPhoneRef.current = normalizedPhoneNumber;
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
            return;
        }

        if (event.key === 'Backspace' || event.key === 'Delete') {
            handlePhoneSelectionDelete(event);
        }
    };

    useEffect(() => {
        const normalizedPhoneNumber = normalizePhoneNumber(countryCode, phoneNumber);

        if (
            step !== 'phone'
            || isLoading
            || !hasEditedPhoneRef.current
            || !normalizedPhoneNumber
            || normalizedPhoneNumber === lastSentPhoneRef.current
        ) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            handleSendOtp();
        }, 350);

        return () => window.clearTimeout(timeoutId);
    }, [countryCode, phoneNumber, step, isLoading]);

    const handleVerificationKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleVerifyOtp();
        }
    };

    return (
        <div className="login-fullscreen">
            {step === 'phone' ? (
                <div className="login-entry" aria-label="Enter your phone number to log in to Critic">
                    <div className="login-wordmark" aria-hidden="true">
                        {CRITIC_TEXT_ROWS.map((row, index) => (
                            <div className="login-wordmark-row" key={`${row.join('-')}-${index}`}>
                                {row.map((segment, segmentIndex) => (
                                    <span
                                        key={`${segment}-${segmentIndex}`}
                                        className={segmentIndex === 1 ? 'login-wordmark-accent' : undefined}
                                    >
                                        {segment}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="login-phone-panel">
                        <div className="login-country-menu-root" ref={countryMenuRef}>
                            <div className="login-phone-field">
                                <button
                                    type="button"
                                    className="login-country-button"
                                    onClick={() => setIsCountryMenuOpen((current) => !current)}
                                    aria-label={`Country code, ${selectedCountry.country} ${getCountryDisplayCode(selectedCountry)}`}
                                    aria-expanded={isCountryMenuOpen}
                                >
                                    <span className="login-phone-flag" aria-hidden="true">{selectedCountry.flag}</span>
                                </button>
                                <span className="login-phone-prefix">{getCountryDisplayCode(selectedCountry)}</span>
                                <input
                                    id="phoneNumber"
                                    ref={phoneInputRef}
                                    className="login-phone-input"
                                    type="tel"
                                    name="phoneNumber"
                                    autoComplete="tel"
                                    inputMode="numeric"
                                    value={formatPhoneNumber(phoneNumber)}
                                    onChange={handlePhoneNumberChange}
                                    onKeyDown={handlePhoneKeyDown}
                                    placeholder="(___) ___-____"
                                    aria-label="Phone number"
                                    autoFocus
                                />
                            </div>
                            {isCountryMenuOpen && (
                                <div className="login-country-menu" role="dialog" aria-label="Choose country code">
                                    <div className="login-country-search-row">
                                        <span className="login-country-search-icon" aria-hidden="true" />
                                        <input
                                            className="login-country-search"
                                            type="search"
                                            value={countrySearch}
                                            onChange={(event) => setCountrySearch(event.target.value)}
                                            placeholder="Search for a country"
                                            aria-label="Search for a country"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="login-country-list">
                                        {!countrySearch.trim() && (
                                            <div className="login-country-group-label">All countries</div>
                                        )}
                                        {filteredCountryOptions.map((option) => (
                                            <button
                                                type="button"
                                                className="login-country-option"
                                                key={getCountryValue(option)}
                                                onClick={() => handleCountryCodeSelect(option)}
                                            >
                                                <span className="login-country-option-flag" aria-hidden="true">{option.flag}</span>
                                                <span className="login-country-option-name">{option.country}</span>
                                                <span className="login-country-option-code">{getCountryDisplayCode(option)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="login-status" aria-live="polite">
                        {isLoading ? 'Sending code' : ''}
                    </div>
                </div>
            ) : (
                <div className="login-code-panel">
                    <input
                        id="verificationCode"
                        className="login-code-input"
                        type="text"
                        name="verificationCode"
                        autoComplete="one-time-code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        onKeyDown={handleVerificationKeyDown}
                        placeholder="123456"
                        aria-label="Verification code"
                        autoFocus
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
