// app/api/organizers/mp-auth-url/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizerId = searchParams.get('organizerId');

    if (!organizerId) {
      return NextResponse.json({ error: 'organizerId es requerido' }, { status: 400 });
    }

    const clientId = process.env.MERCADO_PAGO_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = encodeURIComponent(`${appUrl}/api/organizers/mp-callback`);
    
    // Enviamos organizerId en el parámetro state para reconocerlo al volver
    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${organizerId}&redirect_uri=${redirectUri}`;

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('[MP Auth URL Error]:', error);
    return NextResponse.json({ error: 'Error al generar URL de autorización' }, { status: 500 });
  }
}