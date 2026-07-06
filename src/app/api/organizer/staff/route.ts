import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { normalizeUserRole } from '@/lib/user-role'

export const dynamic = 'force-dynamic';

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

    let staffMembers = []

    const currentUserRole = normalizeUserRole(user.role) // 🚀 Normalizamos el rol

    if (currentUserRole === 'ADMIN') {
      // Admin can see all staff from all organizers
      staffMembers = await prisma.staffMember.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              full_name: true,
              role: true,
              active: true
            }
          },
          organizer: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  full_name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else if (currentUserRole === 'ORGANIZER') {
      // Organizer can only see their own staff
      const organizer = await prisma.organizer.findUnique({
        where: { userId: user.id }
      })

      if (!organizer) {
        return NextResponse.json({ error: 'Organizer not found' }, { status: 404 })
      }

      staffMembers = await prisma.staffMember.findMany({
        where: { organizerId: organizer.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              full_name: true,
              role: true,
              active: true
            }
          },
          organizer: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  full_name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Transform the data to match component interface
    const transformedStaff = staffMembers.map(member => ({
      id: member.user.id,
      full_name: member.user.full_name,
      email: member.user.email,
      role: member.user.role,
      active: member.user.active,
      staffRole: member.role,
      permissions: member.permissions,
      organizerId: member.organizerId,
      organizerName: member.organizer.businessName,
      organizerEmail: member.organizer.user.email,
      staffMemberId: member.id,
      createdAt: member.createdAt
    }))

    return NextResponse.json({ staffMembers: transformedStaff })
  } catch (error) {
    console.error('Staff GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch staff members' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    // Only organizers can add staff members
    if (normalizeUserRole(user.role) !== 'ORGANIZER') {
      return NextResponse.json({ error: 'Only organizers can add staff members' }, { status: 403 })
    }

    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id }
    })

    if (!organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 })
    }

    const { email, role = 'STAFF', permissions = {} } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { email }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is already a staff member of this organizer
    const existingStaff = await prisma.staffMember.findUnique({
      where: {
        organizerId_userId: {
          organizerId: organizer.id,
          userId: targetUser.id
        }
      }
    })

    if (existingStaff) {
      return NextResponse.json({ error: 'User is already a staff member' }, { status: 400 })
    }

    // Create staff member
    const staffMember = await prisma.staffMember.create({
      data: {
        organizerId: organizer.id,
        userId: targetUser.id,
        role,
        permissions
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            role: true,
            active: true
          }
        },
        organizer: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                full_name: true
              }
            }
          }
        }
      }
    })

    // Transform the data to match component interface
    const transformedStaff = {
      id: staffMember.user.id,
      full_name: staffMember.user.full_name,
      email: staffMember.user.email,
      role: staffMember.user.role,
      active: staffMember.user.active,
      staffRole: staffMember.role,
      permissions: staffMember.permissions,
      organizerId: staffMember.organizerId,
      organizerName: staffMember.organizer.businessName,
      organizerEmail: staffMember.organizer.user.email,
      staffMemberId: staffMember.id,
      createdAt: staffMember.createdAt
    }

    return NextResponse.json(transformedStaff)
  } catch (error) {
    console.error('Staff creation error:', error)
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })
  }
}
