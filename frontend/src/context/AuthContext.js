import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  const setAxiosToken = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    setAxiosToken(token);
    try {
      const res = await axios.get(`${API}/api/auth/profile/`);
      setUser(res.data);

      // Check if backend requires password change
      if (res.data?.requires_password_change) {
        setRequiresPasswordChange(true);
      }
    } catch (err) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setAxiosToken(null);
      setRequiresPasswordChange(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Global Axios Interceptor - Detects default password enforcement
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async (error) => {
        const data = error.response?.data;
        if (data?.requires_password_change || 
            (error.response?.status === 403 && data?.detail?.includes("dhaifu"))) {
          setRequiresPasswordChange(true);
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/api/auth/login/`, { email, password });
    
    const { access, refresh, user: userData } = res.data;
    
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setAxiosToken(access);
    setUser(userData);

    if (userData?.requires_password_change) {
      setRequiresPasswordChange(true);
    }

    return userData;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await axios.post(`${API}/api/auth/logout/`, { refresh });
    } catch (err) {}

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAxiosToken(null);
    setUser(null);
    setRequiresPasswordChange(false);
  };

  const clearPasswordChangeFlag = () => {
    setRequiresPasswordChange(false);
    // Refresh profile to sync with backend
    fetchProfile();
  };

  const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) throw new Error('No refresh token.');
    const res = await axios.post(`${API}/api/auth/token/refresh/`, { refresh });
    localStorage.setItem('access_token', res.data.access);
    setAxiosToken(res.data.access);
    return res.data.access;
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      requiresPasswordChange,
      clearPasswordChangeFlag,
      login,
      logout,
      refreshToken,
      fetchProfile
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