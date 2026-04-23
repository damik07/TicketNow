'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  avatar_url?: string | null;
}

export function useAuth() {
  const { data: session, status } = useSession();
  
  const user = session?.user ? {
    id: session.user.email || '', // Use email as ID for now
    full_name: session.user.name || null,
    email: session.user.email || null,
    role: 'user', // This will come from database
    avatar_url: session.user.image || null
  } : null;

  return {
    user,
    isAuthenticated: !!user,
    isLoadingAuth: status === 'loading',
    isLoadingPublicSettings: false,
    authError: null,
    login: async (email: string, password: string) => {
      window.location.href = '/api/auth/signin';
    },
    googleLogin: async () => {
      window.location.href = '/api/auth/signin';
    },
    logout: async () => {
      await signOut();
    }
  };
}
