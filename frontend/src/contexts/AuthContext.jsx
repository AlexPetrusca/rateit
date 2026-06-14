import { createContext, useState, useEffect, useContext } from 'react';
import BackendApiService from '../services/BackendApiService';

const AuthContext = createContext(null);
const AUTH_SESSION_STORAGE_KEY = 'critic.hasAuthSession';

const hasStoredAuthSession = () => localStorage.getItem(AUTH_SESSION_STORAGE_KEY) === 'true';

const storeAuthSession = () => {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, 'true');
};

const clearStoredAuthSession = () => {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(hasStoredAuthSession);
    const [isLoading, setIsLoading] = useState(true);
    const [authCheckRetryCount, setAuthCheckRetryCount] = useState(0);

    const checkAuthStatus = async () => {
        const hadStoredAuthSession = hasStoredAuthSession();

        try {
            const userData = await BackendApiService.getCurrentUser();
            storeAuthSession();
            setUser(userData || null);
            setIsAuthenticated(true);
            setIsLoading(false);
            return userData || null;
        } catch (err) {
            const isUnauthorized = err.status === 401 || err.status === 403;
            const isTransientAuthCheckFailure = hadStoredAuthSession && !isUnauthorized;

            if (isTransientAuthCheckFailure) {
                console.error('Auth check temporarily failed', err);
                setIsAuthenticated(true);
                setIsLoading(true);
                return null;
            }

            if (!isUnauthorized) {
                console.error('Auth check failed', err);
            }
            clearStoredAuthSession();
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            return null;
        }
    };

    useEffect(() => {
        checkAuthStatus();
    }, [authCheckRetryCount]);

    useEffect(() => {
        if (!isLoading || !hasStoredAuthSession() || user != null) {
            return undefined;
        }

        const retryTimer = setTimeout(() => {
            setAuthCheckRetryCount((count) => count + 1);
        }, 2000);

        return () => clearTimeout(retryTimer);
    }, [isLoading, user]);

    const login = (userData) => {
        storeAuthSession();
        setUser(userData);
        setIsAuthenticated(true);
        setIsLoading(false);
    };

    const logout = async () => {
        try {
            await BackendApiService.logout();
        } catch (err) {
            console.error('Logout failed', err);
        } finally {
            clearStoredAuthSession();
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    };

    const updateUser = (userData) => {
        setUser(userData);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateUser, checkAuthStatus }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
