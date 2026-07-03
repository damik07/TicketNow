// app/api/checkout/preference/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import MercadoPagoConfig, { Preference } from "mercadopago";

// Inicializamos MercadoPago con tu Access Token de entorno
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_SECRET_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { ticketId, monto, esDiferenciaConsumo } = await request.json();

    if (!ticketId || !monto || monto <= 0) {
      return NextResponse.json({ error: "Datos de solicitud inválidos" }, { status: 400 });
    }

    // Definimos URLs de retorno absolutas de tu app
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const preferenceFactory = new Preference(client);
    
    const preference = await preferenceFactory.create({
      body: {
        items: [
          {
            id: `diff-${ticketId}`,
            title: "Diferencia de consumo - Barra TicketNow",
            quantity: 1,
            unit_price: Number(monto),
            currency_id: "ARS",
          },
        ],
        // 🔑 CLAVE: Guardamos metadatos cruciales para que el webhook sepa qué hacer al aprobarse
        metadata: {
          ticket_id: ticketId,
          user_id: session.user.id,
          es_diferencia_consumo: !!esDiferenciaConsumo,
        },
        back_urls: {
          success: `${baseUrl}/MisConsumiciones?payment=success`,
          failure: `${baseUrl}/MisConsumiciones?payment=failed`,
          pending: `${baseUrl}/MisConsumiciones?payment=pending`,
        },
        auto_return: "approved",
      },
    });

    // Retornamos el init_point para que el frontend pueda hacer el router.push()
    return NextResponse.json({ 
      id: preference.id, 
      init_point: preference.init_point 
    });

  } catch (error: any) {
    console.error("Error al crear preferencia MP:", error);
    return NextResponse.json({ error: "Error al generar la pasarela de pago" }, { status: 500 });
  }
}