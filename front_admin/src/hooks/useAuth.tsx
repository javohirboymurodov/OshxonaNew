// src/hooks/useAuth.ts - FIXED LOGOUT
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '@/types';
import apiService from '@/services/api';
import AuthUtils from '@/utils/authUtils';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear any corrupted tokens first
    AuthUtils.clearCorruptedTokens();
    
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      console.log('👤 Fetched user data:', userData);
      setUser(userData);
    } catch (error) {
      console.error('Fetch user error:', error);
      // FIXED: Complete token cleanup on fetch error
      localStorage.clear();
      sessionStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { user: userData, token } = await apiService.login(email, password);
      localStorage.setItem('token', token);
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('🔍 useAuth logout called');
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // COMPLETE cleanup - FIXED!
      console.log('🧹 Clearing all auth data...');
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Double-check specific items
      ['token', 'user', 'lastLoginTime', 'authState'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      setUser(null);
      console.log('✅ Auth cleanup completed');
      
      // Force reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};