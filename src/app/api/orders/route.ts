// app/api/orders/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { orderLineBuyerUnitPrice, packCommissionSliceFromPack, roundMoney } from '@/lib/pack-commission'
import { completeQueueSession, validateCheckoutAccess } from '@/lib/queue'
import { MercadoPagoConfig, Preference } from 'mercadopago'

// Inicializamos el cliente de Mercado Pago
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
})


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const userId = searchParams.get('userId')
    const eventId = searchParams.get('eventId')
    const organizerId = searchParams.get('organizerId')

    const orders = await prisma.order.findMany({
      where: {
        ...(userId && { userId }),
        ...(eventId && { eventId }),
        // 2. Si viene un organizerId en la query, filtramos por él en la Base de Datos
        ...(organizerId && {
          event: {
            organizerId: organizerId
          }
        }),
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

    const { eventId, items, paymentMethod, sessionToken } = await request.json()

    if (!eventId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'eventId e items son requeridos' }, { status: 400 })
    }

    const queueCheck = await validateCheckoutAccess(sessionToken, session.user.id, eventId)
    if (!queueCheck.ok) {
      const messages: Record<string, string> = {
        missing_token: 'Necesitás un turno activo para comprar. Volvé al evento e ingresá a la fila.',
        invalid_token: 'Turno de compra inválido.',
        not_admitted: 'Aún no es tu turno de compra.',
        expired: 'Tu tiempo para comprar expiró. Volvé a la fila.',
        already_completed: 'Esta sesión de compra ya fue utilizada.',
      }
      return NextResponse.json(
        { error: messages[queueCheck.reason] ?? 'Acceso denegado a checkout' },
        { status: 403 }
      )
    }

    // 1. Traemos el evento incluyendo su paquete (pack) asociado
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: true, pack: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Obtenemos las configuraciones del paquete (si es absorbido, porcentaje, cargos fijos, etc.)
    const packSlice = packCommissionSliceFromPack(event.pack)

    // Check stock and build server-side prices
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

      const ticketType = event.ticketTypes.find((tt: { id: string }) => tt.id === ticketTypeId)
      if (!ticketType || ticketType.stockAvailable < quantity) {
        return NextResponse.json(
          { error: `No hay stock suficiente para ${ticketType?.name ?? 'el tipo de entrada'}` },
          { status: 400 }
        )
      }

      // La función orderLineBuyerUnitPrice ya calcula si se le suma la comisión 
      // al usuario o si se mantiene el precio base de la entrada según las reglas del paquete.
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

    // Validamos si la app está operando en modo simulado o real
    const isSimulated = process.env.NEXT_PUBLIC_PAYMENT_SIMULATED === 'true'
    const finalStatus = isSimulated ? 'aprobado' : 'pendiente'

    // 2. Creamos la orden (Nace 'pendiente' si vamos por pasarela real)
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
        paymentStatus: finalStatus,
        paymentMethod: isSimulated ? 'simulado' : paymentMethod,
      },
      include: {
        items: true,
        user: true,
        event: true,
      },
    })

    // ==========================================
    // 💡 CASO A: PAGO REAL CON MERCADO PAGO
    // ==========================================
    if (!isSimulated && paymentMethod === 'mercadopago') {
      const preference = new Preference(mpClient)

      // Generamos la preferencia de pago apuntando a las URLs de tu entorno
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      const mpPreference = await preference.create({
        body: {
          items: pricedItems.map((item) => ({
            id: item.ticketTypeId,
            title: `${event.title} - ${item.ticketTypeName}`,
            quantity: item.quantity,
            unit_price: item.unitPrice, // Precio final calculado con la comisión del paquete integrada
            currency_id: 'ARS',
          })),
          external_reference: order.id, // Cruzamos el ID de nuestra Orden para identificarlo en el Webhook
          back_urls: {
            success: `${appUrl}/MisEntradas?status=success`,
            failure: `${appUrl}/Checkout?event_id=${eventId}&status=failure`,
            pending: `${appUrl}/MisEntradas?status=pending`,
          },
          auto_return: 'approved',
          notification_url: `${process.env.MERCADO_PAGO_WEBHOOK_URL}/api/webhooks/mercadopago`,
        },
      })

      // Devolvemos la orden creada en pendiente y el initPoint para redirigir al checkout de MP
      return NextResponse.json({
        order,
        initPoint: mpPreference.init_point,
        packApplied: {
          name: event.pack?.name,
          // Evaluamos si el modo de aplicar la comisión es deduciéndola (absorbida)
          isAbsorbed: event.pack?.ticketPercentApply === 'DEDUCE_DEL_PRECIO'
        }
      })
    }

    // ==========================================
    // 💡 CASO B: PROCESO SIMULADO (Tu flujo original)
    // ==========================================

    // Decrementar Stock
    for (const item of pricedItems) {
      await prisma.ticketType.update({
        where: { id: item.ticketTypeId },
        data: {
          stockAvailable: { decrement: item.quantity },
        },
      })
    }

    // Crear Tickets Físicos inmediatamente
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

    if (sessionToken) {
      await completeQueueSession(sessionToken, eventId)
    }

    return NextResponse.json({
      order,
      tickets: createdTickets,
      packApplied: { name: event.pack?.name }
    })

  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}