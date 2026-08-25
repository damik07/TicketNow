// app/api/organizers/mp-auth-url/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizerId = searchParams.get('organizerId');

    if (!organizerId) {
      return NextResponse.json({ error: 'organizerId es requerido' }, { status: 400 });
    }

    const clientId = (process.env.MERCADO_PAGO_CLIENT_ID || '').trim();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://ticket-now-smoky.vercel.app').replace(/\/$/, '');
    
    // URL base de redirección sin encodeURIComponent manual
    const redirectUri = `${appUrl}/api/organizers/mp-callback`;

    if (!clientId) {
      return NextResponse.json({ error: 'MERCADO_PAGO_CLIENT_ID no configurado' }, { status: 500 });
    }

    // Usamos el objeto URL nativo para construir los parámetros de forma limpia y segura
    const mpUrl = new URL('https://auth.mercadopago.com.ar/authorization');
    mpUrl.searchParams.set('client_id', clientId);
    mpUrl.searchParams.set('response_type', 'code');
    mpUrl.searchParams.set('platform_id', 'mp');
    mpUrl.searchParams.set('state', organizerId);
    mpUrl.searchParams.set('redirect_uri', redirectUri);
    mpUrl.searchParams.set('prompt', 'consent');

    return NextResponse.json({ url: mpUrl.toString() });
  } catch (error) {
    console.error('[MP Auth URL Error]:', error);
    return NextResponse.json({ error: 'Error al generar URL de autorización' }, { status: 500 });
  }
}