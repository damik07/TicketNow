import { prisma } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function processSuccessOrder(orderId: string) {
  // Ejecutamos todo dentro de una transacción exclusiva
  const result = await prisma.$transaction(async (tx) => {
    // Buscamos la orden y verificamos si ya fue procesada antes
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error(`Orden no encontrada: ${orderId}`);
    }

    // 🛡️ Si la orden ya está aprobada, cortamos acá para evitar duplicar entradas
    if (order.paymentStatus === "aprobado" || order.paymentStatus === "paid") {
      return { alreadyProcessed: true, order, createdTickets: [] };
    }

    // Traemos el evento para mapear los datos del Ticket físico
    const event = await tx.event.findUnique({
      where: { id: order.eventId },
    });

    if (!event) {
      throw new Error(`Evento no encontrado para la orden: ${order.eventId}`);
    }

    // Actualizamos el estado de la Orden a 'aprobado'
    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "aprobado" },
    });

    const createdTickets = [];

    for (const item of order.items) {
      // Descontamos stock de forma segura
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: {
          stockAvailable: { decrement: item.quantity },
        },
      });

      // Creamos la cantidad correspondiente de tickets comprados
      for (let i = 0; i < item.quantity; i++) {
        const isConsumicion =
          item.ticketTypeName.toLowerCase().includes("consumición") ||
          item.ticketTypeName.toLowerCase().includes("consumo");

        const ticket = await tx.ticket.create({
          data: {
            orderId: order.id,
            ticketTypeId: item.ticketTypeId,
            eventId: order.eventId,
            userId: order.userId,
            eventTitle: order.eventTitle,
            eventDate: event.dateTime.toISOString(),
            eventLocation: event.locationName,
            ticketTypeName: item.ticketTypeName,
            // Generamos el texto plano único del QR
            qrCode: `TK-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}-${i + 1}`,
            usageStatus: "no_usado",
            holderName: order.userName,
            holderEmail: order.userEmail,
            consumptionBalance: isConsumicion ? item.unitPrice : 0,
            consumptionInitial: isConsumicion ? item.unitPrice : 0,
          },
        });
        createdTickets.push(ticket);

        if (isConsumicion) {
          await tx.consumptionTransaction.create({
            data: {
              ticketId: ticket.id,
              userId: order.userId,
              eventId: order.eventId,
              eventTitle: order.eventTitle,
              ticketTypeName: item.ticketTypeName,
              type: "credito",
              amount: item.unitPrice,
              balanceBefore: 0,
              balanceAfter: item.unitPrice,
              description: "Carga inicial de saldo por compra externa",
            },
          });
        }
      }
    }

    return { alreadyProcessed: false, order, createdTickets };
  });

  // ✉️ ENVÍO DE MAIL REAL (Se ejecuta fuera de la transacción de BD para no ralentizarla)
  if (result && !result.alreadyProcessed && result.createdTickets.length > 0) {
    try {
      const ticketsHtml = result.createdTickets
        .map((ticket) => {
          const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.qrCode)}`;

          return `
          <div style="border: 1px solid #1e293b; background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 15px; text-align: center; font-family: sans-serif; color: #ffffff;">
            <h3 style="margin: 0 0 5px 0; color: #a78bfa;">${ticket.eventTitle}</h3>
            <p style="margin: 0 0 15px 0; font-size: 14px; color: #94a3b8;">${ticket.ticketTypeName}</p>
            <div style="background-color: #ffffff; padding: 10px; display: inline-block; border-radius: 8px;">
              <img src="${qrImageUrl}" alt="Código QR de acceso" width="180" height="180" style="display: block;" />
            </div>
            <p style="margin: 15px 0 0 0; font-size: 12px; color: #64748b;">Código: <strong>${ticket.id}</strong></p>
          </div>
        `;
        })
        .join("");

      await resend.emails.send({
        from: "TicketNow <entradas@ticketnow.com>", // Recordá usar "onboarding@resend.dev" si estás testeando sin dominio propio
        to: result.order.userEmail,
        subject: `¡Tus entradas para ${result.order.eventTitle}! 🎟️`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; background-color: #020617; padding: 30px;">
            <h1 style="color: #ffffff; text-align: center; font-size: 24px; margin-bottom: 10px;">¡Gracias por tu compra, ${result.order.userName}!</h1>
            <p style="color: #94a3b8; text-align: center; margin-bottom: 30px;">Tu pago fue procesado con éxito. A continuación tenés tus accesos confirmados:</p>
            
            ${ticketsHtml}
            
            <hr style="border: 0; border-top: 1px solid #1e293b; margin: 30px 0;" />
            <p style="color: #64748b; font-size: 11px; text-align: center;">Este es un correo automático enviado por TicketNow. No lo respondas.</p>
          </div>
        `,
      });
      console.log(`[Email] Correo enviado con éxito a ${result.order.userEmail}`);
    } catch (mailError) {
      console.error("[Email Error] No se pudo despachar el correo:", mailError);
      // No arrojamos el error para no romper la respuesta HTTP del webhook si la BD ya impactó
    }
  }

  return result;
}