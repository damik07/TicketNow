import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/lib/permissions'

export async function POST(request: NextRequest, context: any // 💡 Cambiamos a 'context: any' para blindar el tipado estricto del build
) {
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

    // Check if user has permission to validate tickets (staff, organizer, or admin)
    if (!['STAFF', 'ORGANIZER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const params = await context.params;
    const ticketId = params.id

    // Find ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          select: {
            title: true
          }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if ticket has already been used
    if (ticket.usageStatus === 'ingresado') {
      return NextResponse.json({ error: 'Ticket already used' }, { status: 400 })
    }

    // Update ticket status to 'ingresado'
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        usageStatus: 'ingresado',
        updatedAt: new Date()
      },
      select: {
        id: true,
        qrCode: true,
        ticketTypeName: true,
        eventTitle: true,
        usageStatus: true
      }
    })

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: `Entrada validada: ${updatedTicket.eventTitle} - ${updatedTicket.ticketTypeName}`
    })
  } catch (error) {
    console.error('Ticket validation error:', error)
    return NextResponse.json({ error: 'Failed to validate ticket' }, { status: 500 })
  }
}
