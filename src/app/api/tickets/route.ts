// app/api/tickets/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const eventId = searchParams.get('eventId')
    const userId = searchParams.get('userId')
    const organizerId = searchParams.get('organizerId')

    const tickets = await prisma.ticket.findMany({
      where: {
        ...(eventId && { eventId }),
        ...(userId && { userId }),
        // 2. Si viene un organizerId en la query, filtramos por él en la Base de Datos
        ...(organizerId && {
          event: {
            organizerId: organizerId
          }
        }),
      },
      include: {
        order: {
          select: {
            totalAmount: true,
            paymentStatus: true,
          }
        },
        ticketType: {
          select: {
            name: true,
            price: true,
          }
        },
        event: {
          select: {
            title: true,
            dateTime: true,
            locationName: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Tickets GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, ticketTypeId, eventId, quantity } = await request.json()

    // Check if ticket type has enough stock
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId }
    })

    if (!ticketType) {
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })
    }

    if (ticketType.stockAvailable < quantity) {
      return NextResponse.json({ error: 'Not enough tickets available' }, { status: 400 })
    }

    // Generate unique QR code
    const qrCode = `TK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create tickets
    const tickets = []
    for (let i = 0; i < quantity; i++) {
      const ticket = await prisma.ticket.create({
        data: {
          orderId,
          ticketTypeId,
          eventId,
          userId: session.user.id,
          eventTitle: ticketType.name, // Will be updated when event is fetched
          eventDate: new Date().toISOString(),
          eventLocation: 'TBD', // Will be updated when event is fetched
          ticketTypeName: ticketType.name,
          qrCode: `${qrCode}-${i + 1}`,
          usageStatus: 'no_usado',
          holderName: session.user.name || 'User',
          holderEmail: session.user.email || '',
          consumptionBalance: ticketType.name.toLowerCase().includes('consumición') ? ticketType.price : 0,
          consumptionInitial: ticketType.name.toLowerCase().includes('consumición') ? ticketType.price : 0,
        }
      })
      tickets.push(ticket)
    }

    // Update available stock
    await prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: {
        stockAvailable: ticketType.stockAvailable - quantity
      }
    })

    return NextResponse.json({ tickets, qrCode })
  } catch (error) {
    console.error('Ticket creation error:', error)
    return NextResponse.json({ error: 'Failed to create tickets' }, { status: 500 })
  }
}
