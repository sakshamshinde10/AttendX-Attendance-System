import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';
import { authApi, LoginPayload } from '../api/auth.api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  // Department info — populated by login/me API
  department?: any;      // department_id (UUID string) — kept for compat
  department_id?: string;
  departments?: {        // Joined department object { id, name, code }
    id: string;
    name: string;
    code: string;
  } | null;
  profilePic?: string;
  boundDeviceId?: string;
  phone?: string;
  gender?: string | null;   // 'male' | 'female' | 'M' | 'F' — used for default avatar selection
  // Academic identity — CANONICAL source. Both Profile and Reports must read these.
  student_id?: string;
  studentId?: string;
  roll_number?: string | null;
  rollNumber?: string | null;
  year?: number | null;       // 1 | 2 | 3 | 4
  semester?: number | null;   // 1-8
  division?: string | null;   // 'A' | 'B' | 'C' | 'D'
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  setUser: () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const refreshUser = async () => {
    try {
      const data = await authApi.getMe();
      if (data.success && data.user) {
        setUser(data.user);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data.user));
      }
    } catch (e) {
      // Offline or network error - preserve cached user data
    }
  };

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Refresh latest profile from backend asynchronously if connected
        refreshUser();
      }
    } catch (e) {
      console.error('Failed to load stored auth:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginPayload) => {
    const data = await authApi.login(credentials);
    if (data.success && data.token) {
      setToken(data.token);
      setUser(data.user);
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data.user));
    } else {
      throw new Error(data.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to log audit trail and revoke session
      await authApi.logout();
    } catch (e) {
      console.warn('Backend logout call error:', e);
    } finally {
      setToken(null);
      setUser(null);
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        '@beaconattend_active_session',
      ]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
