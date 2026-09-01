// app/api/checkout/preference/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MercadoPagoConfig, Preference } from "mercadopago";

export const dynamic = 'force-dynamic';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_SECRET_KEY || "";
const client = new MercadoPagoConfig({ accessToken });

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { type, eventId, ticketId, quantity = 1, monto, title } = await request.json();

    if (!monto || monto <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
    const preferenceFactory = new Preference(client);

    const isEntrada = type === 'ENTRADA';
    const redirectPath = isEntrada ? '/MisEntradas' : '/MisConsumiciones';

    // Verificación en servidor si se están usando credenciales de prueba
    const isTestToken = accessToken.startsWith("TEST-");
    if (isTestToken) {
      console.warn("[MP Warning]: Se está utilizando un Access Token de prueba (TEST-).");
    }

    const preference = await preferenceFactory.create({
      body: {
        items: [
          {
            id: isEntrada ? `event-${eventId}` : `diff-${ticketId}`,
            title: title || (isEntrada ? "Entrada para Evento - TicketNow" : "Diferencia de consumo - Barra"),
            quantity: Number(quantity),
            unit_price: Number(monto),
            currency_id: "ARS",
          },
        ],
        metadata: {
          type: type || 'ENTRADA',
          event_id: eventId || null,
          ticket_id: ticketId || null,
          user_id: session.user.id,
          quantity: Number(quantity),
        },
        back_urls: {
          success: `${baseUrl}${redirectPath}?payment=success`,
          failure: `${baseUrl}${redirectPath}?payment=failed`,
          pending: `${baseUrl}${redirectPath}?payment=pending`,
        },
        auto_return: "approved",
        
        // El webhook solo debe enviarse si la URL base corre sobre HTTPS (exigencia de Mercado Pago)
        ...(baseUrl.startsWith("https://") && {
          notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        }),
      },
    });

    // Para evitar que el frontend tome la URL de Sandbox,
    // devolvemos explícitamente `init_point` como la URL principal de pago
    return NextResponse.json({ 
      id: preference.id, 
      initPoint: preference.init_point, // URL oficial de Producción
      sandboxInitPoint: preference.sandbox_init_point,
    });

  } catch (error: any) {
    console.error("[MP Preference Exception]:", error);
    return NextResponse.json(
      { error: "Error al generar la pasarela de pago", details: error.message }, 
      { status: 500 }
    );
  }
}