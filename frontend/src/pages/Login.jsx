import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const LOGIN_PHONE_STORAGE_KEY = 'critic.loginPhoneNumber';

const Login = () => {
    const [phoneNumber, setPhoneNumber] = useState(() => localStorage.getItem(LOGIN_PHONE_STORAGE_KEY) || '');
    const [verificationCode, setVerificationCode] = useState('');
    const [step, setStep] = useState('phone'); // 'phone' or 'otp'
    const [isLoading, setIsLoading] = useState(false);
    const { checkAuthStatus } = useAuth();
    const { notify } = useNotifications();
    const navigate = useNavigate();

    const handlePhoneNumberChange = (event) => {
        const nextValue = event.target.value;
        setPhoneNumber(nextValue);

        if (nextValue) {
            localStorage.setItem(LOGIN_PHONE_STORAGE_KEY, nextValue);
        } else {
            localStorage.removeItem(LOGIN_PHONE_STORAGE_KEY);
        }
    };

    const handleSendOtp = async () => {
        if (!phoneNumber) {
            notify({ message: 'Please enter a phone number', type: 'warning' });
            return;
        }
        setIsLoading(true);
        try {
            await BackendApiService.sendOtp(phoneNumber);
            setStep('otp');
        } catch (err) {
            const message = err.message || 'Network error. Please try again.';
            notify({ message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!verificationCode) {
            notify({ message: 'Please enter the code', type: 'warning' });
            return;
        }
        setIsLoading(true);
        try {
            await BackendApiService.verifyOtp(phoneNumber, verificationCode);

            // Login successful (cookie set), now get user details
            const user = await checkAuthStatus();

            // If user is null but authentication succeeded (404 from /me), redirect to create account
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

    return (
        <div className="container">
            <h1>Login</h1>
            {step === 'phone' ? (
                <div className="form-group">
                    <label>Phone Number</label>
                    <input
                        id="phoneNumber"
                        type="tel"
                        name="phoneNumber"
                        autoComplete="tel"
                        value={phoneNumber}
                        onChange={handlePhoneNumberChange}
                        placeholder="+1234567890"
                    />
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
