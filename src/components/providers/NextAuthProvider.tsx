// src/components/providers/NextAuthProvider.tsx
'use client';

import { SessionProvider } from "next-auth/react";


interface NextAuthProviderProps {
  children: React.ReactNode;
}

export function NextAuthProvider({ children }: NextAuthProviderProps) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  );
}
