import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { orderLineBuyerUnitPrice, packCommissionSliceFromPack, roundMoney } from '@/lib/pack-commission'

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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, items, paymentMethod } = await request.json()

    if (!eventId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'eventId e items son requeridos' }, { status: 400 })
    }
      where: { id: eventId },
      include: { ticketTypes: true, pack: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const packSlice = packCommissionSliceFromPack(event.pack)

    // Check stock and build server-side prices (no confiar en unitPrice/subtotal del cliente)
    const pricedItems: Array<{
      ticketTypeId: string
      ticketTypeName: string
      quantity: number
      unitPrice: number
      subtotal: number
    }> = []

    for (const raw of items as Array<Record<string, unknown>>) {
      const ticketTypeId = String(raw.ticketTypeId ?? raw.ticket_type_id ?? '')
      const quantity = Math.max(0, Math.floor(Number(raw.quantity ?? 0)))
      if (!ticketTypeId || quantity < 1) {
        return NextResponse.json({ error: 'Cada ítem debe tener ticketTypeId y quantity válidos' }, { status: 400 })
      }

      const ticketType = event.ticketTypes.find((tt) => tt.id === ticketTypeId)
      if (!ticketType || ticketType.stockAvailable < quantity) {
        return NextResponse.json(
          {
            error: `No hay stock suficiente para ${ticketType?.name ?? 'el tipo de entrada'}`,
          },
          { status: 400 }
        )
      }
      const unitPrice = orderLineBuyerUnitPrice(ticketType.price, ticketType.name, packSlice)
      const subtotal = roundMoney(unitPrice * quantity)
      pricedItems.push({
        ticketTypeId,
        ticketTypeName: ticketType.name,
        quantity,
        unitPrice,
        subtotal,
      })
    }

    const totalAmount = roundMoney(pricedItems.reduce((sum, row) => sum + row.subtotal, 0))

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email || '',
        userName: session.user.name || 'Usuario',
        eventId,
        eventTitle: event.title,
        items: {
          create: pricedItems.map((row) => ({
            ticketTypeId: row.ticketTypeId,
            ticketTypeName: row.ticketTypeName,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            subtotal: row.subtotal,
          })),
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

    for (const item of pricedItems) {
      await prisma.ticketType.update({
        where: { id: item.ticketTypeId },
        data: {
          stockAvailable: {
            decrement: item.quantity,
          },
        },
      })
    }

    // Create individual tickets
    const createdTickets = []
    for (const item of pricedItems) {
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
            holderName: session.user.name || 'Usuario',
            holderEmail: session.user.email || '',
            consumptionBalance: item.ticketTypeName.toLowerCase().includes('consumición') ? item.unitPrice : 0,
            consumptionInitial: item.ticketTypeName.toLowerCase().includes('consumición') ? item.unitPrice : 0,
          },
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
            },
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
