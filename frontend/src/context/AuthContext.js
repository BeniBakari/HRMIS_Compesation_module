import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                             = useState(null);
  const [loading, setLoading]                       = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const setAxiosToken = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }
    setAxiosToken(token);
    try {
      const res = await axios.get(`${API}/api/auth/profile/`);
      setUser(res.data);
      if (res.data.must_change_password) {
        setMustChangePassword(true);
      }
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setAxiosToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/api/auth/login/`, { email, password });
    const { access, refresh, user: userData, must_change_password } = res.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setAxiosToken(access);
    setUser(userData);
    if (must_change_password || userData?.must_change_password) {
      setMustChangePassword(true);
    }
    return userData;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await axios.post(`${API}/api/auth/logout/`, { refresh });
    } catch { }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAxiosToken(null);
    setUser(null);
    setMustChangePassword(false);
  };

  const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) throw new Error('No refresh token.');
    const res = await axios.post(`${API}/api/auth/token/refresh/`, { refresh });
    localStorage.setItem('access_token', res.data.access);
    setAxiosToken(res.data.access);
    return res.data.access;
  };

  const clearMustChangePassword = () => {
  setMustChangePassword(false);
  setUser(prev => prev ? { ...prev, must_change_password: false } : prev);
  fetchProfile();
};
  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, refreshToken, fetchProfile,
      mustChangePassword, clearMustChangePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}