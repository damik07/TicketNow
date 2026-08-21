// app/api/auth/mercadopago/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const organizerId = searchParams.get("state"); // ID del organizador enviado en el paso anterior

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ticket-now-smoky.vercel.app";

  if (!code || !organizerId) {
    console.error("[MP OAuth Callback] Faltan parámetros clave (code o state/organizerId).");
    return NextResponse.redirect(`${appUrl}/Dashboard?error=mp_invalid_params`);
  }

  try {
    const clientSecret = process.env.MERCADO_PAGO_CLIENT_SECRET || process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const clientId = process.env.MERCADO_PAGO_CLIENT_ID;
    const redirectUri = process.env.MERCADO_PAGO_REDIRECT_URI;

    if (!clientSecret || !clientId || !redirectUri) {
      console.error("[MP OAuth Callback] Faltan variables de entorno necesarias.");
      return NextResponse.redirect(`${appUrl}/Dashboard?error=mp_missing_env_vars`);
    }

    // 1. Intercambiamos el código de autorización por el Access Token
    // IMPORTANTE: No se envía header 'Authorization'
    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        client_secret: clientSecret,
        client_id: clientId,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
      console.error("[MP OAuth Callback] Error en intercambio de token:", tokenData);
      return NextResponse.redirect(`${appUrl}/Dashboard?error=mp_token_exchange_failed`);
    }

    // 2. Guardamos las credenciales completas en la base de datos
    await prisma.organizer.update({
      where: { id: organizerId },
      data: {
        mercadopagoUserId: String(tokenData.user_id),
        // Si ya agregaste estos campos al schema de Prisma:
        ...(tokenData.access_token && { mercadopagoAccessToken: tokenData.access_token }),
        ...(tokenData.refresh_token && { mercadopagoRefreshToken: tokenData.refresh_token }),
        ...(tokenData.expires_in && {
          mercadopagoExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        }),
      },
    });

    // 3. Redirección exitosa
    return NextResponse.redirect(`${appUrl}/Dashboard?success=mp_connected`);

  } catch (error) {
    console.error("[MP OAuth Callback] Error crítico en el servidor:", error);
    return NextResponse.redirect(`${appUrl}/Dashboard?error=mp_internal_server_error`);
  }
}