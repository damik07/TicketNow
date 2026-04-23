'use client';

import { SessionProvider } from "next-auth/react";
import { authOptions } from "@/lib/auth";

interface NextAuthProviderProps {
  children: React.ReactNode;
}

export function NextAuthProvider({ children }: NextAuthProviderProps) {
  return (
    <SessionProvider session={null}>
      {children}
    </SessionProvider>
  );
}
