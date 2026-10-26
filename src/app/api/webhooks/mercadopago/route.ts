// app/api/webhooks/mercadopago/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Payment, MercadoPagoConfig } from 'mercadopago'
import { processSuccessOrder } from '@/lib/orders/processOrder'
import { prisma } from '@/lib/db'
import { mpClient } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 1. Detección flexible de tipo y ID (soporta query params y body de Mercado Pago)
    let type = searchParams.get('type') || searchParams.get('topic')
    let dataId = searchParams.get('data.id') || searchParams.get('id')

    let body: any = null;
    try {
      body = await request.json()
      type = type || body?.type || body?.topic || (body?.action?.includes('payment') ? 'payment' : null)
      dataId = dataId || body?.data?.id || body?.id
    } catch {
      // Si el request viene sin body o no es JSON válido, ignoramos el parseo
    }

    console.log(`[MP Webhook Received] Type: ${type}, DataID: ${dataId}`, body ? JSON.stringify(body) : 'Sin body');

    // 🛡️ Aceptamos cualquier evento que sea de pago de forma amplia
    const isPaymentEvent = 
      type === 'payment' || 
      type === 'payment.created' || 
      type === 'payment.updated' ||
      body?.action === 'payment.created' ||
      body?.action === 'payment.updated';

    if (!isPaymentEvent || !dataId) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 2. Obtención segura de los datos del pago
    let paymentData: any = null;

    try {
      const paymentClient = new Payment(mpClient);
      paymentData = await paymentClient.get({ id: String(dataId) });
    } catch (err) {
      console.warn(`[MP Webhook] Falló cliente principal para pago ${dataId}. Intentando vía Fetch API...`);
      
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
        }
      });

      if (res.ok) {
        paymentData = await res.json();
      } else {
        console.error(`[MP Webhook Error]: Imposible recuperar pago ${dataId} con token global`, await res.text());
        return NextResponse.json({ received: true, warning: 'Payment fetch failed' }, { status: 200 });
      }
    }

    if (!paymentData) {
      console.error(`[MP Webhook Error]: No se pudieron obtener datos para el pago ${dataId}`);
      return NextResponse.json({ received: true, warning: 'No payment data' }, { status: 200 });
    }

    const metadata = paymentData.metadata;
    const paymentStatus = paymentData.status;

    console.log(`[MP Webhook] Pago ${dataId} recuperado con éxito. Estado: ${paymentStatus}`);

    // =========================================================================
    // 🍹 1. DETECCIÓN: Pagos de Consumiciones
    // =========================================================================
    if (metadata && metadata.es_diferencia_consumo) {
      if (paymentStatus === 'approved') {
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

    if (paymentStatus === 'approved') {
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (existingOrder) {
        if (existingOrder.paymentStatus !== 'aprobado') {
          await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: 'aprobado' }
          });
        }

        // 🚀 Ejecuta la generación de tickets y envío de emails de forma garantizada
        try {
          console.log(`[MP Webhook] Disparando processSuccessOrder para la orden ${orderId}...`);
          await processSuccessOrder(orderId);
          console.log(`[MP Webhook] Orden ${orderId} procesada y tickets creados exitosamente.`);
        } catch (procError) {
          console.error(`[MP Webhook Error] Falló processSuccessOrder para ${orderId}:`, procError);
        }
      } else {
        console.warn(`[MP Webhook] Orden con ID ${orderId} no encontrada en la base de datos local.`);
      }
    } else {
      console.warn('[MP Webhook] Pago no aprobado:', {
        paymentId: dataId,
        orderId,
        status: paymentStatus,
      })
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error: any) {
    console.error('[MP Webhook Error critical]:', error.message || error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}