import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface User {
  id: string
  email: string
  full_name?: string
  role: string
  avatar_url?: string
}

export function useAuth() {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true)
      return
    }

    if (session?.user) {
      setUser(session.user as User)
      setLoading(false)
    } else {
      setUser(null)
      setLoading(false)
    }
  }, [session, status])

  return { user, loading, session }
}
