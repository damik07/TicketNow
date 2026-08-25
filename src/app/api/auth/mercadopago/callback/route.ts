// app/api/organizers/mp-callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const organizerId = searchParams.get('state');
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://ticket-now-smoky.vercel.app').replace(/\/$/, '');

  if (!code || !organizerId) {
    return NextResponse.redirect(`${appUrl}/dashboard?mp_error=invalid_callback`);
  }

  try {
    const clientId = (process.env.MERCADO_PAGO_CLIENT_ID || '').trim();
    const accessToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();
    const redirectUri = `${appUrl}/api/organizers/mp-callback`;

    // 1. Petición OAuth a Mercado Pago usando Bearer Token de prueba
    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`, // Autentica la App en Sandbox
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: accessToken, // MP Sandbox acepta el Access Token como secret en el body
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[MP OAuth Exchange Failure]:', {
        status: response.status,
        dataResponse: data,
        sentClientId: clientId,
        sentRedirectUri: redirectUri,
      });
      return NextResponse.redirect(`${appUrl}/dashboard?mp_error=token_exchange_failed`);
    }

    // 2. Guardamos las credenciales del vendedor/organizador en Neon con Prisma
    await prisma.organizer.update({
      where: { id: organizerId },
      data: {
        mercadopagoUserId: String(data.user_id),
        mercadopagoAccessToken: data.access_token,
        mercadopagoRefreshToken: data.refresh_token,
        mercadopagoExpiresAt: new Date(Date.now() + (data.expires_in || 15552000) * 1000),
      },
    });

    return NextResponse.redirect(`${appUrl}/dashboard?mp_success=true`);
  } catch (error) {
    console.error('[MP OAuth Callback Exception]:', error);
    return NextResponse.redirect(`${appUrl}/dashboard?mp_error=server_error`);
  }
}