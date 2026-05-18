// src/hooks/useAuth.ts
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { normalizeUserRole } from '@/lib/user-role';

export function useAuth() {
  const { data: session, status } = useSession();
  
  const user = session?.user ? {
    id: session.user.id,
    full_name: session.user.name || null,
    email: session.user.email || null,
    role: normalizeUserRole(session.user.role),
    avatar_url: session.user.image || null
  } : null;

  return {
    user,
    isAuthenticated: status === 'authenticated',
    status, // Para que puedas ver "loading", "authenticated" o "unauthenticated"
    isLoadingAuth: status === 'loading',
    login: () => signIn('google'),
    logout: () => signOut({ callbackUrl: '/' }) // Redirige al home tras salir
  };
}