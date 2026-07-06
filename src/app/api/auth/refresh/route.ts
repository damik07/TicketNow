import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        avatar_url: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: 'Session refreshed',
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        image: user.avatar_url,
      }
    })
  } catch (error) {
    console.error('Session refresh error:', error)
    return NextResponse.json({ error: 'Failed to refresh session' }, { status: 500 })
  }
}
