"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api';

interface AuthUser {
  doctor_id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string, name?: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedName = localStorage.getItem('name');
      
      if (storedToken) {
        try {
          // Verify token is still valid by fetching user info
          const userInfo = await api('/auth/me', 'GET', undefined, storedToken);
          setToken(storedToken);
          setUser(userInfo);
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('name');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Auto-refresh token periodically
  useEffect(() => {
    if (token) {
      const interval = setInterval(async () => {
        try {
          await refreshToken();
        } catch (error) {
          console.error('Failed to refresh token:', error);
          logout();
        }
      }, 24 * 60 * 60 * 1000); // Refresh daily

      return () => clearInterval(interval);
    }
  }, [token]);

  const login = async (email: string, password: string, name?: string) => {
    const response = await api('/auth/login', 'POST', { email, password });
    
    setToken(response.token);
    setUser({
      doctor_id: response.doctor_id,
      name: response.name,
      email: email
    });
    
    localStorage.setItem('token', response.token);
    localStorage.setItem('name', response.name);
  };

  const register = async (email: string, password: string, name?: string) => {
    const response = await api('/auth/register', 'POST', { 
      email, 
      password, 
      name: name || email.split('@')[0] 
    });
    
    setToken(response.token);
    setUser({
      doctor_id: response.doctor_id,
      name: response.name,
      email: email
    });
    
    localStorage.setItem('token', response.token);
    localStorage.setItem('name', response.name);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('name');
  };

  const refreshToken = async () => {
    if (!token) return;
    
    const response = await api('/auth/refresh', 'POST', undefined, token);
    setToken(response.token);
    localStorage.setItem('token', response.token);
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    refreshToken,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div className="container text-center" style={{ padding: '3rem' }}>
          <div className="text-xl">Loading...</div>
        </div>
      );
    }

    if (!user) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }

    return <Component {...props} />;
  };
}