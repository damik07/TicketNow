// app/api/organizers/mp-callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const organizerId = searchParams.get('state');

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://ticket-now-smoky.vercel.app').replace(/\/$/, '');
  const redirectUri = `${appUrl}/api/organizers/mp-callback`;

  if (!code || !organizerId) {
    console.error('[MP OAuth Callback Error]: Faltan parámetros requeridos (code o state).');
    return NextResponse.redirect(`${appUrl}/dashboard?mp_error=missing_params`);
  }

  try {
    const clientId = (process.env.MERCADO_PAGO_CLIENT_ID || '').trim();
    const clientSecret = (process.env.MERCADO_PAGO_CLIENT_SECRET || process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();

    if (!clientId || !clientSecret) {
      console.error('[MP OAuth Callback Error]: Faltan variables MERCADO_PAGO_CLIENT_ID o MERCADO_PAGO_CLIENT_SECRET.');
      return NextResponse.redirect(`${appUrl}/dashboard?mp_error=server_configuration_error`);
    }

    const isSandbox = process.env.MERCADO_PAGO_ENV === 'sandbox' || clientSecret.startsWith('TEST-');

    const bodyParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    });

    if (isSandbox) {
      bodyParams.append('test_token', 'true');
    }

    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: bodyParams,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[MP OAuth Exchange Failure]:', {
        status: response.status,
        dataResponse: data,
        sentClientId: clientId,
        sentRedirectUri: redirectUri,
        isSandbox,
      });
      return NextResponse.redirect(`${appUrl}/dashboard?mp_error=token_exchange_failed`);
    }

    // Calcular la fecha de vencimiento del token (180 días)
    const expiresInSeconds = data.expires_in || 15552000;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // PERSISTENCIA EN NEON / PRISMA
    await prisma.organizer.update({
      where: { id: organizerId },
      data: {
        mercadopagoUserId: String(data.user_id),
        mercadopagoAccessToken: data.access_token,
        mercadopagoRefreshToken: data.refresh_token,
        mercadopagoExpiresAt: expiresAt,
      },
    });

    // Redirección al dashboard indicando éxito
    return NextResponse.redirect(`${appUrl}/dashboard?mp_success=true`); // dashboard?mp_success=true para cuando está en prueba
  } catch (error) {
    console.error('[MP Callback Exception]:', error);
    return NextResponse.redirect(`${appUrl}/dashboard?mp_error=internal_error`);
  }
}