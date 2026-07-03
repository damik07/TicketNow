import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const organizerId = searchParams.get("state"); // Recuperamos el ID que enviamos en el paso anterior

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!code || !organizerId) {
        console.error("Callback incorrecto de Mercado Pago: Faltan parámetros clave.");
        return NextResponse.redirect(`${appUrl}/Dashboard?error=mp_invalid_params`);
    }

    try {
        // 1. Intercambiamos el código de autorización por el Access Token definitivo
        const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`, // Tu Token Maestro de la App
            },
            body: new URLSearchParams({
                client_secret: process.env.MERCADO_PAGO_CLIENT_SECRET!,
                client_id: process.env.MERCADO_PAGO_CLIENT_ID!,
                grant_type: "authorization_code",
                code: code,
                redirect_uri: process.env.MERCADO_PAGO_REDIRECT_URI!,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error || !tokenData.access_token) {
            console.error("Error de Mercado Pago OAuth:", tokenData);
            return NextResponse.redirect(`${appUrl}/Dashboard?error=mp_token_exchange_failed`);
        }

        // 2. Guardamos las credenciales en la tabla Organizer de Prisma (Neon)
        // Asegurate de mapear correctamente los nombres de tus columnas corporativas/internas
        await prisma.organizer.update({
            where: { id: organizerId },
            data: {
                mercadopagoUserId: String(tokenData.user_id),
            } as any, // 👈 Forzamos el casteo para evitar el error de validación estricta de TS
        });

        // 3. Redirigimos con éxito al usuario de vuelta a su panel de control
        return NextResponse.redirect(`${appUrl}/Dashboard?success=mp_connected`);

    } catch (error) {
        console.error("Error crítico en el callback de Mercado Pago:", error);
        return NextResponse.redirect(`${appUrl}/Dashboard?error=mp_internal_server_error`);
    }
}