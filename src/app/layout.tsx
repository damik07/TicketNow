import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { Toaster } from "@/components/ui/toaster"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { NextAuthProvider } from "@/components/providers/NextAuthProvider"
import { ourFileRouter } from "@/app/api/uploadthing/core";

import './globals.css'
import LayoutWrapper from "@/layoutWrapper"

export const metadata = {
  title: 'TicketNow',
  description: 'Tu plataforma de tickets y eventos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased" style={{ colorScheme: 'dark' }}>
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)}/>
        <NextAuthProvider>
          <QueryProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
            <Toaster />
          </QueryProvider>
        </NextAuthProvider>
        
      </body>
    </html>
  )
}