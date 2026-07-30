// src/lib/auth.ts

import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import CredentialsProvider from 'next-auth/providers/credentials'
import { normalizeUserRole } from '@/lib/user-role'
import bcrypt from 'bcrypt'

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
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const { prisma } = await import('./db')

        // Buscamos al usuario por email
        const dbUser = await prisma.user.findUnique({
          where: { email: credentials.email.trim() }
        })

        // Validamos que exista, que esté activo y que tenga una contraseña asignada (que no sea un usuario puramente de Google)
        if (!dbUser || !dbUser.active || !dbUser.password_hash) {
          return null
        }

        // Verificamos el hash hash de la contraseña
        const isPasswordValid = await bcrypt.compare(credentials.password, dbUser.password_hash)

        if (!isPasswordValid) {
          return null
        }

        // Retornamos el objeto básico. Next-auth lo pasará temporalmente al parámetro 'user' del callback jwt
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.full_name,
          role: dbUser.role
        }
      }
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }: any) {
      // 1) INICIO DE SESIÓN INICIAL (Tanto Google como Credentials entran acá la primera vez)
      if (user) {
        if (account && (account.provider === 'google' || account.provider === 'facebook')) {
          // --- Flujo Google (Tu lógica original de upsert) ---
          try {
            const { prisma } = await import('./db')

            const dbUser = await prisma.user.upsert({
              where: { email: user.email! },
              update: {
                full_name: user.name || '',
                avatar_url: user.image || '',
                provider: 'google',
                provider_id: account.providerAccountId,
                updatedAt: new Date(),
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
            console.log('User synced and role assigned (Google):', dbUser.email, token.role)
          } catch (error) {
            console.error('Error syncing user (Google):', error)
          }
        } else {
          // --- Flujo Credentials ---
          // El objeto 'user' aquí es exactamente lo que retornaste en authorize()
          token.id = user.id
          token.role = normalizeUserRole(user.role)
          console.log('User logged in via Credentials:', user.email, token.role)
        }
      } else {
        // 2) PETICIONES SUBSECUENTES (Refresh del token)
        try {
          const { prisma } = await import('./db')
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