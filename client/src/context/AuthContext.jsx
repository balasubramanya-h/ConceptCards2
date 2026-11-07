import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('conceptcards_token'));
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user data on startup if token exists
  const fetchCurrentUser = useCallback(async () => {
    const savedToken = localStorage.getItem('conceptcards_token');
    if (!savedToken) {
      setUser(null);
      setUserStats(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.getMe();
      if (response.data.success) {
        setUser(response.data.user);
        setUserStats(response.data.stats);
        localStorage.setItem('conceptcards_user', JSON.stringify(response.data.user));
      }
    } catch (err) {
      console.warn('Session expired or invalid:', err?.response?.data?.message || err.message);
      localStorage.removeItem('conceptcards_token');
      localStorage.removeItem('conceptcards_user');
      setUser(null);
      setToken(null);
      setUserStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    // Listen for 401 unauthorized events from Axios interceptor
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setUserStats(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [fetchCurrentUser]);

  // Login action
  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    if (response.data.success) {
      const { token: receivedToken, user: receivedUser } = response.data;
      localStorage.setItem('conceptcards_token', receivedToken);
      localStorage.setItem('conceptcards_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      // Fetch full stats
      fetchCurrentUser();
      return receivedUser;
    }
    throw new Error(response.data.message || 'Login failed');
  };

  // Register action
  const register = async (username, email, password, displayName) => {
    const response = await authAPI.register({ username, email, password, displayName });
    if (response.data.success) {
      const { token: receivedToken, user: receivedUser } = response.data;
      localStorage.setItem('conceptcards_token', receivedToken);
      localStorage.setItem('conceptcards_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      fetchCurrentUser();
      return receivedUser;
    }
    throw new Error(response.data.message || 'Registration failed');
  };

  // Logout action
  const logout = () => {
    localStorage.removeItem('conceptcards_token');
    localStorage.removeItem('conceptcards_user');
    setToken(null);
    setUser(null);
    setUserStats(null);
  };

  // Profile update
  const updateUser = async (data) => {
    const response = await authAPI.updateMe(data);
    if (response.data.success) {
      setUser(response.data.user);
      localStorage.setItem('conceptcards_user', JSON.stringify(response.data.user));
      return response.data.user;
    }
    throw new Error(response.data.message || 'Profile update failed');
  };

  const value = {
    user,
    token,
    userStats,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    updateUser,
    refreshUser: fetchCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

