// app/api/organizers/mp-callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const organizerId = searchParams.get('state');

  if (!code || !organizerId) {
    return NextResponse.redirect(
      new URL('/dashboard?mp_error=missing_params', request.url)
    );
  }

  const clientId = (process.env.MERCADO_PAGO_CLIENT_ID || '').trim();
  const clientSecret = (process.env.MERCADO_PAGO_CLIENT_SECRET || '').trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://ticket-now-smoky.vercel.app').replace(/\/$/, '');
  const redirectUri = `${appUrl}/api/organizers/mp-callback`;

  // Determinar si estamos en Sandbox / Pruebas
  const isSandbox = process.env.MERCADO_PAGO_ENV === 'sandbox' || clientSecret.startsWith('TEST-');

  const bodyParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
  });

  // SI ESTAMOS EN SANDBOX / MODO PRUEBAS:
  // Se requiere 'test_token=true' para que acepte el client_secret de pruebas
  if (isSandbox) {
    bodyParams.append('test_token', 'true');
  }

  try {
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
      return NextResponse.redirect(
        new URL('/dashboard?mp_error=token_exchange_failed', request.url)
      );
    }

    // data contendrá: access_token, refresh_token, public_key, user_id, etc.
    // Guardar tokens en la base de datos...

    return NextResponse.redirect(
      new URL('/dashboard?mp_success=true', request.url)
    );
  } catch (error) {
    console.error('[MP Callback Exception]:', error);
    return NextResponse.redirect(
      new URL('/dashboard?mp_error=internal_error', request.url)
    );
  }
}