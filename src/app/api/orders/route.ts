import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const userId = searchParams.get('userId')
    const eventId = searchParams.get('eventId')

    const orders = await prisma.order.findMany({
      where: {
        ...(userId && { userId }),
        ...(eventId && { eventId }),
      },
      include: {
        items: {
          include: {
            ticketType: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
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

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Orders GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, items, totalAmount, paymentMethod } = await request.json()

    // Verify event exists and has available tickets
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: true }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check stock availability
    for (const item of items) {
      const ticketType = event.ticketTypes.find((tt: any) => tt.id === item.ticketTypeId)
      if (!ticketType || ticketType.stockAvailable < item.quantity) {
        return NextResponse.json({ 
          error: `Not enough tickets available for ${ticketType.name}` 
        }, { status: 400 })
      }
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email || '',
        userName: session.user.full_name || 'User',
        eventId,
        eventTitle: event.title,
        items: {
          create: items.map((item: any) => ({
            ticketTypeId: item.ticketTypeId,
            ticketTypeName: item.ticketTypeName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          }))
        },
        totalAmount,
        paymentStatus: 'aprobado', // For demo purposes
        paymentMethod,
      },
      include: {
        items: true,
        user: true,
        event: true
      }
    })

    // Update ticket stock
    for (const item of items) {
      await prisma.ticketType.update({
        where: { id: item.ticketTypeId },
        data: {
          stockAvailable: {
            decrement: item.quantity
          }
        }
      })
    }

    // Create individual tickets
    const createdTickets = []
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticket = await prisma.ticket.create({
          data: {
            orderId: order.id,
            ticketTypeId: item.ticketTypeId,
            eventId,
            userId: session.user.id,
            eventTitle: event.title,
            eventDate: event.dateTime.toISOString(),
            eventLocation: event.locationName,
            ticketTypeName: item.ticketTypeName,
            qrCode: `TK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${i + 1}`,
            usageStatus: 'no_usado',
            holderName: session.user.full_name || 'User',
            holderEmail: session.user.email || '',
            consumptionBalance: item.ticketTypeName.toLowerCase().includes('consumición') ? item.unitPrice : 0,
            consumptionInitial: item.ticketTypeName.toLowerCase().includes('consumición') ? item.unitPrice : 0,
          }
        })
        createdTickets.push(ticket)

        // Create initial credit transaction for consumptions
        if (item.ticketTypeName.toLowerCase().includes('consumición')) {
          await prisma.consumptionTransaction.create({
            data: {
              ticketId: ticket.id,
              userId: session.user.id,
              eventId,
              eventTitle: event.title,
              ticketTypeName: item.ticketTypeName,
              type: 'credito',
              amount: item.unitPrice,
              balanceBefore: 0,
              balanceAfter: item.unitPrice,
              description: 'Carga inicial de saldo',
            }
          })
        }
      }
    }

    return NextResponse.json({ order, tickets: createdTickets })
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
