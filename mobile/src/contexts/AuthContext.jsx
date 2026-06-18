import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import BackendApiService from '../services/BackendApiService.js';
import {
  clearStoredAuthSession,
  hasStoredAuthSession,
  storeAuthSession
} from '../storage/sessionStorage.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    const hadSession = await hasStoredAuthSession();

    try {
      const userData = await BackendApiService.getCurrentUser();
      await storeAuthSession();
      setUser(userData || null);
      setIsAuthenticated(true);
      setIsLoading(false);
      return userData || null;
    } catch (error) {
      const unauthorized = error.status === 401 || error.status === 403;
      if (hadSession && !unauthorized) {
        setIsAuthenticated(true);
      } else {
        await clearStoredAuthSession();
        setIsAuthenticated(false);
      }
      setUser(null);
      setIsLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = useCallback(async (userData) => {
    await storeAuthSession();
    setUser(userData || null);
    setIsAuthenticated(true);
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await BackendApiService.logout();
    } finally {
      await clearStoredAuthSession();
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser: setUser,
    checkAuthStatus
  }), [user, isAuthenticated, isLoading, login, logout, checkAuthStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
