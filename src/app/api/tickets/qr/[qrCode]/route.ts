// 📄 Ubicación: src/app/api/tickets/qr/[qrCode]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { normalizeUserRole } from '@/lib/user-role' // 🚀 Cambiado

export async function GET(
  request: NextRequest, 
  context: any // 💡 Mantenemos para blindar el tipado estricto del build
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

    // 🚀 Cambiado: Chequeo de rol con string normalizado unificado
    const currentUserRole = normalizeUserRole(user.role)
    if (!['STAFF', 'ORGANIZER', 'ADMIN'].includes(currentUserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const params = await context.params;
    const qrCode = params.qrCode

    // Find ticket by QR code
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        ticketType: {
          select: {
            name: true,
            price: true
          }
        },
        event: {
          select: {
            title: true,
            dateTime: true,
            locationName: true
          }
        },
        user: {
          select: {
            full_name: true,
            email: true
          }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Transform to match component interface
    const transformedTicket = {
      id: ticket.id,
      qrCode: ticket.qrCode,
      ticketTypeName: ticket.ticketTypeName,
      userId: ticket.userId,
      eventId: ticket.eventId,
      eventTitle: ticket.eventTitle,
      usageStatus: ticket.usageStatus,
      consumptionBalance: ticket.consumptionBalance,
      consumptionInitial: ticket.consumptionInitial
    }

    return NextResponse.json(transformedTicket)
  } catch (error) {
    console.error('QR Ticket lookup error:', error)
    return NextResponse.json({ error: 'Failed to lookup ticket' }, { status: 500 })
  }
}