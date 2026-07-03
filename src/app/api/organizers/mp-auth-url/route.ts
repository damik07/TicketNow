import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizerId = searchParams.get("organizerId");

    if (!organizerId) {
      return NextResponse.json({ error: "organizerId es requerido" }, { status: 400 });
    }

    const clientId = process.env.MERCADO_PAGO_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.MERCADO_PAGO_REDIRECT_URI!);

    // Armamos la URL oficial de OAuth. 
    // Usamos 'state' para transportar el ID del organizador de manera segura a través del flujo.
    const mpAuthUrl = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${organizerId}&redirect_uri=${redirectUri}`;

    return NextResponse.json({ url: mpAuthUrl });
  } catch (error) {
    console.error("Error al generar MP auth URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}