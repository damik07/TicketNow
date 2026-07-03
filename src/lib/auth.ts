// src/lib/auth.ts

import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { normalizeUserRole } from '@/lib/user-role'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }: any) {
      // 1) Primer inicio de sesión con Google: upsert en DB y rol inicial
      if (account && user) {
        try {
          const { prisma } = await import('./prisma')

          const dbUser = await prisma.user.upsert({
            where: { email: user.email! },
            update: {
              full_name: user.name || '',
              avatar_url: user.image || '',
              provider: 'google',
              provider_id: account.providerAccountId,
              updatedAt: new Date(),
              // No tocamos el rol en update: se mantiene el de la DB
            },
            create: {
              email: user.email!,
              full_name: user.name || '',
              avatar_url: user.image || '',
              role: 'USER',
              provider: 'google',
              provider_id: account.providerAccountId,
              active: true,
            },
          })

          token.id = dbUser.id
          token.role = normalizeUserRole(dbUser.role)
          console.log('User synced and role assigned:', dbUser.email, token.role)
        } catch (error) {
          console.error('Error syncing user:', error)
        }
      } else {
        try {
          const { prisma } = await import('./prisma')
          let dbUser: { id: string; role: string } | null = null

          if (token.id) {
            dbUser = await prisma.user.findUnique({
              where: { id: String(token.id) },
              select: { id: true, role: true },
            })
          }
          if (!dbUser && token.email) {
            dbUser = await prisma.user.findUnique({
              where: { email: String(token.email).trim() },
              select: { id: true, role: true },
            })
          }
          if (dbUser) {
            token.id = dbUser.id
            token.role = normalizeUserRole(dbUser.role)
          }
        } catch (error) {
          console.error('Error refrescando rol desde DB:', error)
        }
      }

      return token
    },

    async session({ session, token }: any) {
      if (token && session.user) {
        // 3. Pasamos los datos del token a la sesión del cliente
        session.user.id = token.id as string
        session.user.role = normalizeUserRole(token.role)
      }
      return session
    },
  },
  pages: {
    signIn: '/Login',
    error: '/Login',
  },
  debug: process.env.NODE_ENV === 'development',
}