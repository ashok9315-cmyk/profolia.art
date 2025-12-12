import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/api.client';

interface User {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  userId: string;
  username: string;
  name: string;
  professionType: string;
  email?: string;
  phone?: string;
  githubUrl?: string;
  websiteUrl?: string;
  resumeUrl?: string;
  bio?: string;
  skills?: string[];
  customFields?: Record<string, any>;
  isPublished: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/profiles/me');
      setProfile(response.data.profile);
      setUser({
        id: response.data.profile.userId,
        email: response.data.profile.email
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { accessToken: token, refreshToken } = response.data;
      
      setAccessToken(token);
      setUser(response.data.user);
      
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch profile after successful login
      await fetchProfile();
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/register', { email, password });
      const { accessToken: token, refreshToken } = response.data;
      
      setAccessToken(token);
      setUser(response.data.user);
      
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    setProfile(null);
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete apiClient.defaults.headers.common['Authorization'];
  };

  const refreshProfile = async () => {
    if (accessToken) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      accessToken,
      login,
      register,
      logout,
      isAuthenticated: !!accessToken && !!user,
      loading,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
