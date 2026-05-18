import type { AppUserRole } from '@/lib/user-role'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: AppUserRole
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    role: AppUserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: AppUserRole
  }
}
