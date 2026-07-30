// app/api/organizers/mp-callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const organizerId = searchParams.get('state'); // Recibimos el organizerId que enviamos en state
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!code || !organizerId) {
    return NextResponse.redirect(`${appUrl}/dashboard?mp_error=invalid_callback`);
  }

  try {
    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_secret: process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_SECRET_KEY || '',
        client_id: process.env.MERCADO_PAGO_CLIENT_ID || '',
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${appUrl}/api/organizers/mp-callback`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[MP OAuth Error Data]:', data);
      return NextResponse.redirect(`${appUrl}/dashboard?mp_error=token_exchange_failed`);
    }

    // 🔑 Guardamos las credenciales en la tabla Organizer de la BD
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