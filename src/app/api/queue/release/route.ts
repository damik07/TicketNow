// app/api/queue/release/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { releaseQueueSession } from '@/lib/queue';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { sessionToken, eventId } = await request.json();

    if (!sessionToken || !eventId) {
      return NextResponse.json({ error: 'sessionToken y eventId son requeridos' }, { status: 400 });
    }

    await releaseQueueSession(sessionToken, eventId);

    return NextResponse.json({ success: true, message: 'Cupo de fila liberado correctamente' });
  } catch (error) {
    console.error('Error al liberar cupo de la fila:', error);
    return NextResponse.json({ error: 'Error interno al liberar cupo' }, { status: 500 });
  }
}