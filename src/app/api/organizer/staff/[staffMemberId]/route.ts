import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/lib/permissions'

export async function DELETE(request: NextRequest, { params }: { params: { staffMemberId: string } }) {
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

    const staffMemberId = params.staffMemberId

    // Find the staff member
    const staffMember = await prisma.staffMember.findUnique({
      where: { id: staffMemberId },
      include: {
        organizer: true
      }
    })

    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Check permissions
    if (user.role === UserRole.ADMIN) {
      // Admin can delete any staff member
    } else if (user.role === UserRole.ORGANIZER) {
      // Organizer can only delete their own staff members
      const organizer = await prisma.organizer.findUnique({
        where: { userId: user.id }
      })

      if (!organizer || organizer.id !== staffMember.organizerId) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete the staff member
    await prisma.staffMember.delete({
      where: { id: staffMemberId }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Staff member removed successfully'
    })
  } catch (error) {
    console.error('Staff member deletion error:', error)
    return NextResponse.json({ error: 'Failed to remove staff member' }, { status: 500 })
  }
}
