// app/api/checkout/simulate-success/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processSuccessOrder } from "@/lib/orders/processOrder";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 🧪 1. Capturamos el texto crudo para verificar si el JSON es válido
    const rawBody = await request.text();
    console.log("[Simulate Success] Raw Body recibido:", rawBody);

    if (!rawBody) {
      return NextResponse.json({ error: "El cuerpo de la petición está vacío" }, { status: 400 });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("[Simulate Success] Error parseando JSON:", e);
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { orderId } = body;
    console.log("[Simulate Success] orderId extraído:", orderId);

    if (!orderId) {
      return NextResponse.json({ error: "Falta el parámetro orderId" }, { status: 400 });
    }

    console.log("[Simulate Success] Iniciando procesamiento de la orden...");
    const result = await processSuccessOrder(orderId);
    console.log("[Simulate Success] Resultado del helper:", result);

    return NextResponse.json({ 
      success: true, 
      message: "Simulación de pago completada con éxito y entradas enviadas.",
      alreadyProcessed: result?.alreadyProcessed
    }, { status: 200 });

  } catch (error: any) {
    console.error("[Simulate Success Error General]:", error.message || error);
    return NextResponse.json({ error: "Failed to simulate success order" }, { status: 500 });
  }
}