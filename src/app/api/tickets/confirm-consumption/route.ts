// app/api/tickets/confirm-consumption/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { ticketId, action } = await request.json(); // action puede ser 'approve' o 'reject'

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket || ticket.userId !== session.user.id) {
      return NextResponse.json({ error: "Ticket no encontrado o no te pertenece" }, { status: 404 });
    }

    if (ticket.usageStatus !== "esperando_confirmacion") {
      return NextResponse.json({ error: "No hay cobros pendientes para este ticket" }, { status: 400 });
    }

    // Si expiró el tiempo, lo cancelamos automáticamente
    if (ticket.pendingExpiresAt && ticket.pendingExpiresAt < new Date()) {
      await resetTicketStatus(ticket.id);
      return NextResponse.json({ error: "La solicitud de cobro expiró." }, { status: 400 });
    }

    if (action === "reject") {
      await resetTicketStatus(ticket.id);
      return NextResponse.json({ success: true, message: "Cobro rechazado por el usuario." });
    }

    // 🚀 CONTROL DE SALDO CRÍTICO ANTES DE PASAR A LA TRANSACCIÓN
    const deductValue = ticket.pendingDeduction || 0;
    const currentBalance = ticket.consumptionBalance || 0;

    if (currentBalance < deductValue) {
      // Devolvemos un código de estado específico y la diferencia exacta para que el frontend actúe
      return NextResponse.json({ 
        error: "Saldo insuficiente para procesamiento directo.",
        requiresPartialPayment: true,
        difference: deductValue - currentBalance
      }, { status: 402 }); // 402 Payment Required es ideal para esto
    }

    // SI EL USUARIO TIENE SALDO SUFICIENTE: Aplicamos la transacción segura de débito
    const result = await prisma.$transaction(async (tx) => {
      const newBalance = currentBalance - deductValue;
      
      // Inteligencia de estado: Si se quedó en $0, queda "consumido", si le queda saldo, vuelve a "no_usado" o "parcial"
      const finalStatus = newBalance <= 0 ? "consumido" : "parcial";

      const updated = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          consumptionBalance: newBalance,
          usageStatus: finalStatus, 
          pendingDeduction: null,
          pendingOperatorId: null,
          pendingExpiresAt: null
        }
      });

      // Guardamos la auditoría con el ID del operador
      await tx.consumptionTransaction.create({
        data: {
          ticketId: ticket.id,
          userId: ticket.userId,
          eventId: ticket.eventId,
          eventTitle: ticket.eventTitle,
          ticketTypeName: ticket.ticketTypeName,
          type: "debito",
          amount: deductValue,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description: `Consumo confirmado por usuario. Despachado por Staff ID: ${ticket.pendingOperatorId}`,
        }
      });

      return updated;
    });

    return NextResponse.json({ success: true, newBalance: result.consumptionBalance });

  } catch (error) {
    return NextResponse.json({ error: "Error al procesar confirmación" }, { status: 500 });
  }
}

async function resetTicketStatus(ticketId: string) {
  // Retornamos al estado correspondiente analizando si ya tenía consumos previos
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  const previousStatus = (ticket?.consumptionBalance ?? 0) < (ticket?.consumptionInitial ?? 0) ? "parcial" : "no_usado";

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      usageStatus: previousStatus,
      pendingDeduction: null,
      pendingOperatorId: null,
      pendingExpiresAt: null
    }
  });
}