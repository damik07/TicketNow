// app/api/webhooks/mercadopago/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { processSuccessOrder } from '@/lib/orders/processOrder'
import { prisma } from '@/lib/db'
import { mpClient } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 1. Parsear id y type tanto de Query Params como del JSON Body (Compatibilidad MP V2)
    let type = searchParams.get('type') || searchParams.get('topic')
    let dataId = searchParams.get('data.id') || searchParams.get('id')

    if (!dataId) {
      try {
        const body = await request.json()
        type = type || body.type || (body.action?.includes('payment') ? 'payment' : null)
        dataId = body.data?.id || body.id
      } catch {
        // Ignoramos error de parseo si venía sin body
      }
    }

    // Si no es un evento de pago o no tenemos ID, respondemos 200 OK para descartar
    if ((type !== 'payment' && type !== 'payment.created' && type !== 'payment.updated') || !dataId) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const paymentClient = new Payment(mpClient)
    let paymentData;
    
    try {
      paymentData = await paymentClient.get({ id: dataId });
    } catch (err) {
      console.error(`[MP Webhook] No se pudo obtener el pago ${dataId}:`, err);
      return NextResponse.json({ received: true, warning: 'Payment fetch failed' }, { status: 200 });
    }

    const metadata = paymentData.metadata;

    // =========================================================================
    // 🍹 1. DETECCIÓN: Pagos de Consumiciones / Diferencia de Saldo en Barra
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
      // Devolvemos 200 para evitar retries infinitos de un evento huérfano
      return NextResponse.json({ received: true, warning: 'Missing external reference' }, { status: 200 })
    }

    if (paymentData.status === 'approved') {
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId }
      });

      // Verificamos por paymentStatus !== 'aprobado' para mantener idempotencia
      if (existingOrder && existingOrder.paymentStatus !== 'aprobado') {
        // Actualizamos estado de pago en la orden
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'aprobado' }
        });

        // Ejecuta la emisión de QRs y lógica final
        await processSuccessOrder(orderId);
        console.log(`[MP Webhook] Orden ${orderId} aprobada correctamente.`);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error: any) {
    console.error('[MP Webhook Error]:', error.message || error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}