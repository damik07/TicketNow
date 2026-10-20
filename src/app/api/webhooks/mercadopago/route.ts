// app/api/webhooks/mercadopago/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { processSuccessOrder } from '@/lib/orders/processOrder'
import { prisma } from '@/lib/db'
import { mpClient, getValidOrganizerAccessToken } from '@/lib/mercadopago'
import { MercadoPagoConfig } from 'mercadopago'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 1. Parsear id y type
    let type = searchParams.get('type') || searchParams.get('topic')
    let dataId = searchParams.get('data.id') || searchParams.get('id')

    if (!dataId) {
      try {
        const body = await request.json()
        type = type || body.type || (body.action?.includes('payment') ? 'payment' : null)
        dataId = body.data?.id || body.id
      } catch {
        // Ignorar error si viene sin body
      }
    }

    if ((type !== 'payment' && type !== 'payment.created' && type !== 'payment.updated') || !dataId) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 2. Intentar obtener el pago con el cliente global de la plataforma
    let paymentClient = new Payment(mpClient)
    let paymentData;

    try {
      paymentData = await paymentClient.get({ id: dataId });
    } catch (err) {
      console.warn(`[MP Webhook] No se pudo obtener el pago ${dataId} con el token global. Intentando via Fetch API directo...`);
      
      // Fallback: Consulta directa enviando Bearer Token
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
        }
      });
      if (res.ok) {
        paymentData = await res.json();
      } else {
        console.error(`[MP Webhook Error]: Imposible recuperar pago ${dataId}`, await res.text());
        return NextResponse.json({ received: true, warning: 'Payment fetch failed' }, { status: 200 });
      }
    }

    const metadata = paymentData.metadata;

    // =========================================================================
    // 🍹 1. DETECCIÓN: Pagos de Consumiciones
    // =========================================================================
    if (metadata && metadata.es_diferencia_consumo) {
      if (paymentData.status === 'approved') {
        const ticketId = metadata.ticket_id
        const montoPagadoMP = paymentData.transaction_amount || 0

        await prisma.$transaction(async (tx) => {
          const ticket = await tx.ticket.findUnique({ where: { id: ticketId } })
          if (!ticket || ticket.usageStatus !== "esperando_confirmacion") return

          const totalADebitar = ticket.pendingDeduction || 0
          const saldoViejo = ticket.consumptionBalance || 0
          const nuevoSaldoFinal = (saldoViejo + montoPagadoMP) - totalADebitar
          const estadoFinal = nuevoSaldoFinal <= 0 ? "consumido" : "parcial"

          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              consumptionBalance: nuevoSaldoFinal,
              usageStatus: estadoFinal,
              pendingDeduction: null,
              pendingOperatorId: null,
              pendingExpiresAt: null
            }
          })

          await tx.consumptionTransaction.create({
            data: {
              ticketId: ticket.id,
              userId: ticket.userId,
              eventId: ticket.eventId,
              eventTitle: ticket.eventTitle,
              ticketTypeName: ticket.ticketTypeName,
              type: "debito",
              amount: totalADebitar,
              balanceBefore: saldoViejo,
              balanceAfter: nuevoSaldoFinal,
              description: `Consumo mixto (Saldo: $${saldoViejo} + MercadoPago: $${montoPagadoMP}). Despachado por Staff ID: ${ticket.pendingOperatorId}`,
            }
          })
        })
      }

      return NextResponse.json({ success: true, message: 'Diferencia de consumo procesada' }, { status: 200 })
    }

    // =========================================================================
    // 🎟️ 2. FLUJO CONVENCIONAL: Venta de Entradas
    // =========================================================================
    const orderId = paymentData.external_reference || metadata?.order_id;

    if (!orderId) {
      console.error(`[MP Webhook] Pago ${dataId} sin external_reference ni order_id`)
      return NextResponse.json({ received: true, warning: 'Missing external reference' }, { status: 200 })
    }

    if (paymentData.status === 'approved') {
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (existingOrder && existingOrder.paymentStatus !== 'aprobado') {
        const updated = await prisma.order.updateMany({
          where: {
            id: orderId,
            paymentStatus: { not: 'aprobado' }
          },
          data: { paymentStatus: 'aprobado' }
        });

        if (updated.count > 0) {
          // 🚀 Ejecuta la generación de tickets y envío de emails
          try {
            await processSuccessOrder(orderId);
            console.log(`[MP Webhook] Orden ${orderId} procesada y tickets creados exitosamente.`);
          } catch (procError) {
            console.error(`[MP Webhook Error] Falló processSuccessOrder para ${orderId}:`, procError);
          }
        } else {
          console.log(`[MP Webhook] Orden ${orderId} ya estaba siendo procesada.`);
        }
      }
    } else {
      console.warn('[MP Webhook] Pago no aprobado:', {
        paymentId: dataId,
        orderId,
        status: paymentData.status,
      })
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error: any) {
    console.error('[MP Webhook Error]:', error.message || error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}