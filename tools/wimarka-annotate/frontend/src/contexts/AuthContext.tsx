import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, LoginCredentials, RegisterData } from '../types';
import { authAPI, authStorage } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  markGuidelinesSeen: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = authStorage.getUser();
    const storedToken = authStorage.getToken();

    if (storedUser && storedToken) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const authData = await authAPI.login(credentials);
      authStorage.setToken(authData.access_token);
      authStorage.setUser(authData.user);
      setUser(authData.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const authData = await authAPI.register(userData);
      authStorage.setToken(authData.access_token);
      authStorage.setUser(authData.user);
      setUser(authData.user);
    } catch (error) {
      throw error;
    }
  };

  const markGuidelinesSeen = async () => {
    try {
      const updatedUser = await authAPI.markGuidelinesSeen();
      authStorage.setUser(updatedUser);
      setUser(updatedUser);
    } catch (error) {
      console.error('Error marking guidelines as seen:', error);
      throw error;
    }
  };

  const logout = () => {
    authStorage.removeToken();
    authStorage.removeUser();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    markGuidelinesSeen,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 