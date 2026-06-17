// src/components/providers/NextAuthProvider.tsx
'use client';

import { SessionProvider } from "next-auth/react";


interface NextAuthProviderProps {
  children: React.ReactNode;
}

// coloco el refresh de la session en 5 miunutos (60*5=300)
export function NextAuthProvider({ children }: NextAuthProviderProps) {
  return (
    <SessionProvider refetchInterval={300} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  );
}
