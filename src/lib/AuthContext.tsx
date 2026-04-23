'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  avatar_url?: string | null;
}

interface AuthError {
  type: string;
  message: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: AuthError | null;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  const isAuthenticated = !!user;

  // Verificar si hay un token guardado al cargar
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Por ahora, simular un usuario para que la app funcione
      setUser({
        id: '1',
        full_name: 'Usuario Demo',
        email: 'demo@ticketnow.com',
        role: 'user',
        avatar_url: null
      });
    }
    setIsLoadingPublicSettings(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    
    try {
      // Simulación de login
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Guardar token
      localStorage.setItem('auth_token', 'demo-token');
      
      // Setear usuario demo
      setUser({
        id: '1',
        full_name: 'Usuario Demo',
        email: email,
        role: 'user',
        avatar_url: null
      });
    } catch (error) {
      setAuthError({
        type: 'login_error',
        message: 'Error al iniciar sesión'
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const googleLogin = async () => {
    // Redirigir a Google OAuth (implementación futura)
    window.location.href = '/api/auth/google';
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      login,
      googleLogin,
      logout
    }}>
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
