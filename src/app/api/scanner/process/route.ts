import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado. Iniciá sesión." }, { status: 401 });
    }

    const scannerUserId = session.user.id; 
    const body = await request.json();
    const { qrCode, amountToDeduct } = body; 

    if (!qrCode) {
      return NextResponse.json({ error: "Código QR ausente." }, { status: 400 });
    }

    // 1. Buscamos el ticket por su código QR único
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: { event: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket inválido o inexistente." }, { status: 404 });
    }

    const eventId = ticket.eventId;

    // 2. 🛡️ CONTROL DE PERMISOS ADAPTADO A TU MODELO
    const isOrganizer = ticket.event.organizerId === scannerUserId;
    
    // Buscamos si el usuario es un Staff Activo asignado al Organizador del evento
    const staffMember = await prisma.staffMember.findFirst({
      where: {
        organizerId: ticket.event.organizerId,
        userId: scannerUserId,
        active: true // Verificamos que no esté de baja
      }
    });

    const isStaff = !!staffMember;

    if (!isOrganizer && !isStaff) {
      return NextResponse.json({ error: "No tenés permisos de Staff para este evento." }, { status: 403 });
    }

    const isConsumicion = ticket.ticketTypeName.toLowerCase().includes("consumición") || 
                          ticket.ticketTypeName.toLowerCase().includes("consumo");

    // =========================================================================
    // FLUJO A: ES UNA ENTRADA BASE (CONTROL DE ACCESO / INGRESO EN PUERTA)
    // =========================================================================
    if (!isConsumicion) {
      if (ticket.usageStatus === "ingresado") {
        return NextResponse.json({ 
          error: "¡ALERTA FRAUDE! Este ticket ya ingresó.", 
          status: "already_used",
          holderName: ticket.holderName 
        }, { status: 400 });
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { usageStatus: "ingresado" }
      });

      // 📝 REGISTRO DE AUDITORÍA REAL
      await prisma.auditLog.create({
        data: {
          action: "INGRESO_PUERTA",
          eventId: eventId,
          userId: ticket.userId, 
          operatorId: scannerUserId, 
          description: `Entrada #${ticket.id.slice(-6)} validada en puerta por ${isOrganizer ? 'Organizador' : 'Staff'}. Titular: ${ticket.holderName}`,
        }
      });

      return NextResponse.json({
        success: true,
        type: "entry",
        message: "Ingreso AUTORIZADO",
        holderName: ticket.holderName,
        ticketTypeName: ticket.ticketTypeName
      });
    }

    // =========================================================================
    // 🛠️ FLUJO B MODIFICADO: TICKET DE CONSUMICIÓN (APROBACIÓN EN DOS PASOS)
    // =========================================================================
    
    // CAMBIO Quirúrgico 1: Bloqueo por transacción pendiente activa
    if (ticket.usageStatus === "esperando_confirmacion") {
      return NextResponse.json({
        error: "Ya hay un cobro pendiente de confirmación en el teléfono del cliente.",
        status: "waiting_customer",
        holderName: ticket.holderName,
        pendingAmount: ticket.pendingDeduction
      }, { status: 400 });
    }

    const deductValue = Number(amountToDeduct) || ticket.consumptionInitial; 

    // Verificación básica de saldo
    if ((ticket.consumptionBalance ?? 0) < deductValue) {
      return NextResponse.json({
        error: "Saldo INSUFICIENTE en la consumición.",
        status: "no_balance",
        currentBalance: ticket.consumptionBalance,
        holderName: ticket.holderName
      }, { status: 400 });
    }

    // CAMBIO Quirúrgico 2: No debitamos, congelamos el saldo y pasamos a estado intermedio
    const pendingTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        usageStatus: "esperando_confirmacion",
        pendingDeduction: deductValue
      }
    });

    // Avisamos a la interfaz del Staff que el cobro fue enviado al celular del cliente
    return NextResponse.json({
      success: true,
      type: "consumption_requested",
      status: "waiting_customer",
      message: "Solicitud enviada al cliente. Esperando confirmación...",
      holderName: ticket.holderName,
      deductedAmount: deductValue,
      remainingBalance: ticket.consumptionBalance // El balance real sigue intacto hasta que acepte
    });

  } catch (error: any) {
    console.error("[Scanner API Error]:", error);
    return NextResponse.json({ error: "Error interno al procesar el QR" }, { status: 500 });
  }
}