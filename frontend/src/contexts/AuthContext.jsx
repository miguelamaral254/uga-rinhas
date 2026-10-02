import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';

const TOKEN_KEY = 'uga_rinhas_token';
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    authService
      .me()
      .then(setAccount)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    localStorage.setItem(TOKEN_KEY, data.token);
    setAccount(data.account);
  };

  const register = async (data_) => {
    const data = await authService.register(data_);
    localStorage.setItem(TOKEN_KEY, data.token);
    setAccount(data.account);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAccount(null);
  };

  const updateProfile = async (displayName) => {
    setAccount(await authService.updateProfile(displayName));
  };

  const changePassword = (payload) => authService.changePassword(payload);

  return (
    <AuthContext.Provider
      value={{ account, loading, login, register, logout, updateProfile, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
