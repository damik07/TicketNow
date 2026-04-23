import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, UserRole } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user by email first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin
    if (!hasPermission(user.role as UserRole, 'users', 'read')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url!)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''

    const where = {
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { full_name: { contains: search, mode: 'insensitive' as const } }
        ]
      }),
      ...(role && { role: role as UserRole })
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          active: true,
          createdAt: true,
          organizer: {
            select: {
              id: true,
              businessName: true,
              verified: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Admin users GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user by email first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin
    if (!hasPermission(user.role as UserRole, 'users', 'update')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId, role, active } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Prevent admin from changing their own role
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot modify your own role' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role && { role: role as UserRole }),
        ...(active !== undefined && { active })
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        active: true,
        updatedAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Admin users PUT error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
