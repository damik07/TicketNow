// app/api/webhooks/mercadopago/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { processSuccessOrder } from '@/lib/orders/processOrder'
import { prisma } from '@/lib/prisma' // 👈 Asegurate de importar tu instancia de Prisma

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
})

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || searchParams.get('topic')
    const dataId = searchParams.get('data.id') || searchParams.get('id')

    if (type !== 'payment' || !dataId) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const paymentClient = new Payment(mpClient)
    const paymentData = await paymentClient.get({ id: dataId })

    // 🚨 1. DETECCIÓN CRÍTICA: ¿Es un pago de diferencia de saldo en la barra?
    const metadata = paymentData.metadata
    
    if (metadata && metadata.es_diferencia_consumo) {
      if (paymentData.status === 'approved') {
        const ticketId = metadata.ticket_id
        const montoPagadoMP = paymentData.transaction_amount || 0

        console.log(`[MP Webhook] Procesando cobro mixto en barra para Ticket ID: ${ticketId} por $${montoPagadoMP}`)

        await prisma.$transaction(async (tx) => {
          // Buscamos el ticket para extraer la deducción solicitada por el staff y el balance actual
          const ticket = await tx.ticket.findUnique({
            where: { id: ticketId }
          })

          if (!ticket) {
            throw new Error(`Ticket ${ticketId} no encontrado en base de datos.`)
          }

          if (ticket.usageStatus !== "esperando_confirmacion") {
            console.warn(`[MP Webhook] El ticket ${ticketId} ya cambió de estado (${ticket.usageStatus}). Cancelando duplicación.`)
            return
          }

          const totalADebitar = ticket.pendingDeduction || 0
          const saldoViejo = ticket.consumptionBalance || 0

          // Lógica: (Saldo Actual + Lo pagado en MP) - Lo consumido
          // Al ser el pago de MP idéntico a la diferencia, el saldo final tiende al remanente correcto o $0
          const nuevoSaldoFinal = (saldoViejo + montoPagadoMP) - totalADebitar
          
          // Inteligencia de estados: Si se consumió todo el saldo inicial pasa a 'consumido', sino queda como 'parcial'
          const estadoFinal = nuevoSaldoFinal <= 0 ? "consumido" : "parcial"

          // Actualizamos el ticket liberando los campos pendientes
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

          // Insertamos la auditoría histórica de consumición
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

        console.log(`[MP Webhook] Cobro de barra procesado con éxito para Ticket ${ticketId}`)
      }

      // Respondemos 200 a MP para cerrar la notificación de barra
      return NextResponse.json({ success: true, message: 'Diferencia de consumo procesada' }, { status: 200 })
    }

    // =========================================================================
    // 🎟️ FLUJO CONVENCIONAL: Compra de Entradas (Código Original)
    // =========================================================================
    const orderId = paymentData.external_reference

    if (!orderId) {
      console.error(`[MP Webhook] Notificación sin external_reference ni metadata de barra para el pago: ${dataId}`)
      return NextResponse.json({ error: 'Missing external reference' }, { status: 400 })
    }

    // Si está aprobado en Mercado Pago, disparamos nuestro helper unificado de entradas
    if (paymentData.status === 'approved') {
      await processSuccessOrder(orderId)
      console.log(`[MP Webhook] Orden de entradas ${orderId} procesada y mail enviado via helper.`)
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error: any) {
    console.error('[MP Webhook Error]:', error.message || error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}