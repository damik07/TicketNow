import React, { createContext, useState, useContext, useEffect } from 'react';
import { verifySessionToken } from '@/lib/google-auth';

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
  logout: () => void;
  googleLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  // Verificar sesión al cargar el componente
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const userData = await verifySessionToken(token);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error verificando sesión:', error);
      localStorage.removeItem('auth_token');
    }
  };

  // Login con email y contraseña
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      
      // Llamar a API endpoint para login con email
      const response = await fetch('/api/auth/email/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al iniciar sesión');
      }

      const data = await response.json();
      
      // Guardar token y datos de usuario
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (error: any) {
      setAuthError({
        type: 'invalid_credentials',
        message: error.message || 'Usuario o contraseña incorrectos'
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Login con Google OAuth
  const googleLogin = async (): Promise<void> => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      
      // Iniciar flujo de Google OAuth
      const response = await fetch('/api/auth/google/init', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Error al iniciar autenticación con Google');
      }

      const data = await response.json();
      
      // Redirigir a Google
      window.location.href = data.authUrl;
    } catch (error: any) {
      setAuthError({
        type: 'google_login_failed',
        message: error.message || 'Error al iniciar sesión con Google'
      });
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      login,
      logout,
      googleLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
