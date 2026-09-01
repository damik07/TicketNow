import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  orderLineBuyerUnitPrice,
  packCommissionSliceFromPack,
  roundMoney,
  ticketPlatformFeeUnit,
} from '@/lib/pack-commission'
import { completeQueueSession, validateCheckoutAccess } from '@/lib/queue'

import { getValidOrganizerAccessToken } from '@/lib/mercadopago'
import { MercadoPagoConfig, Preference } from 'mercadopago'

export const dynamic = 'force-dynamic';

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
        ...(organizerId && {
          event: { organizerId }
        }),
      },
      include: {
        items: {
          include: { ticketType: true }
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

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: true,
        pack: true,
        organizer: true
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const packSlice = packCommissionSliceFromPack(event.pack)

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
    const isSimulated = process.env.NEXT_PUBLIC_PAYMENT_SIMULATED === 'true'
    const finalStatus = isSimulated ? 'aprobado' : 'pendiente'

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
    // 💡 CASO A: PAGO REAL CON MERCADO PAGO (SPLIT PAYMENT)
    // ==========================================
    if (!isSimulated && paymentMethod === 'mercadopago') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const webhookBaseUrl = process.env.MERCADO_PAGO_WEBHOOK_URL || appUrl

      const packSlice = packCommissionSliceFromPack(event.pack)
      const totalServiceCharge = roundMoney(
        pricedItems.reduce((acc, item) => {
          const ticketType = event.ticketTypes.find((tt) => tt.id === item.ticketTypeId)
          const listPrice = ticketType?.price ?? 0
          const unitFee = ticketPlatformFeeUnit(listPrice, packSlice)
          return acc + roundMoney(unitFee * item.quantity)
        }, 0)
      )

      const disableMarketplaceFee = process.env.MERCADO_PAGO_DISABLE_MARKETPLACE_FEE === 'true'

      let organizerAccessToken: string
      try {
        organizerAccessToken = await getValidOrganizerAccessToken(event.organizer.id)
      } catch {
        return NextResponse.json(
          {
            error:
              'El organizador del evento debe vincular Mercado Pago antes de vender entradas.',
          },
          { status: 400 }
        )
      }

      // 1. Cliente instanciado dinámicamente con el Access Token del organizador
      const organizerMpClient = new MercadoPagoConfig({
        accessToken: organizerAccessToken,
      })

      // 2. Pasamos el cliente a la clase Preference
      const preference = new Preference(organizerMpClient)

      // 3. Inferimos el tipo exacto del body soportado por la versión del SDK
      type PreferenceBody = Parameters<typeof preference.create>[0]['body']

      const preferenceBody: PreferenceBody = {
        items: pricedItems.map((item) => ({
          id: item.ticketTypeId,
          title: `${event.title} - ${item.ticketTypeName}`,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: 'ARS',
        })),
        payer: {
          email: session.user.email || undefined,
          name: session.user.name || undefined,
        },
        external_reference: order.id,
        metadata: {
          order_id: order.id,
          event_id: eventId,
        },
        back_urls: {
          success: `${appUrl}/MisEntradas?status=success`,
          failure: `${appUrl}/Checkout?event_id=${eventId}&session_token=${sessionToken}&status=failure`,
          pending: `${appUrl}/MisEntradas?status=pending`,
        },
        auto_return: 'approved',
      }

      if (!disableMarketplaceFee && totalServiceCharge > 0) {
        preferenceBody.marketplace_fee = totalServiceCharge
      }

      if (webhookBaseUrl.startsWith('https://')) {
        preferenceBody.notification_url = `${webhookBaseUrl}/api/webhooks/mercadopago`
      }

      let mpPreference
      try {
        mpPreference = await preference.create({
          body: preferenceBody,
        })
      } catch (mpError: unknown) {
        const mpMessage =
          mpError instanceof Error
            ? mpError.message
            : typeof mpError === 'object' && mpError !== null && 'message' in mpError
              ? String((mpError as { message: unknown }).message)
              : 'Error desconocido'

        console.error('[MP Preference Error]:', {
          orderId: order.id,
          organizerId: event.organizer.id,
          totalAmount,
          marketplaceFee: disableMarketplaceFee ? 0 : totalServiceCharge,
          mpMessage,
        })

        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'cancelado' },
        })

        return NextResponse.json(
          { error: 'No se pudo generar la pasarela de Mercado Pago. Verificá la vinculación del organizador.' },
          { status: 502 }
        )
      }

      console.log('[MP Preference Created]:', {
        orderId: order.id,
        preferenceId: mpPreference.id,
        totalAmount,
        marketplaceFee: disableMarketplaceFee ? 0 : totalServiceCharge,
        hasInitPoint: Boolean(mpPreference.init_point),
      })

      return NextResponse.json({
        order,
        initPoint: mpPreference.init_point,
        sandboxInitPoint: mpPreference.sandbox_init_point,
        packApplied: {
          name: event.pack?.name,
          isAbsorbed: event.pack?.ticketPercentApply === 'DEDUCE_DEL_PRECIO',
        },
      })
    }

    // ==========================================
    // 💡 CASO B: PROCESO SIMULADO
    // ==========================================
    if (sessionToken) {
      await completeQueueSession(sessionToken, eventId)
    }

    for (const item of pricedItems) {
      await prisma.ticketType.update({
        where: { id: item.ticketTypeId },
        data: {
          stockAvailable: { decrement: item.quantity },
        },
      })
    }

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