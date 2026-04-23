import React from 'react';
import { useAuth } from '@/lib/AuthContext';

const GoogleLogin: React.FC = () => {
  const { googleLogin, isLoadingAuth } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      // Implementar Google OAuth aquí
      await googleLogin();
    } catch (error) {
      console.error('Error en login de Google:', error);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={isLoadingAuth}
      className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25-.06-1.37.09-2.06.27-2.88.67.39-1.64.69-2.42.89-3.16.24-1.61.38-2.49.52-3.31.13-.98.2-1.38.2-2.06-.06-.56-.12-.82-.2-.15-.45-.52-.8-.8-1.08-.17-.35-.39-.72-.65-1.06-.27-.28-.49-.6-.69-1.01-.2-.38-.44-.79-.59-1.29-.21-.66-.31-1.06-.42-1.58-.14-.46-.25-.86-.31-1.24-.14-.44-.25-.84-.31-1.25-.13-.42-.24-.8-.31-1.19-.1-.36-.19-.69-.28-1.03-.15-.46-.28-.87-.36-1.3l-1.89 1.19c-.27.28-.49.6-.69 1.01-.2.38-.44.79-.59 1.29-.21.66-.31 1.06-.42 1.58-.14.46-.25.86-.31 1.24-.14.44-.25.84-.31 1.19-.1.36-.19.69-.28 1.03-.15.46-.28.87-.36 1.3l-1.89 1.19c-.27.28-.49.6-.69 1.01-.2.38-.44.79-.59 1.29-.21.66-.31 1.06-.42 1.58z"
        />
      </svg>
      <span className="ml-2">
        {isLoadingAuth ? 'Iniciando sesión...' : 'Continuar con Google'}
      </span>
    </button>
  );
};

export default GoogleLogin;
