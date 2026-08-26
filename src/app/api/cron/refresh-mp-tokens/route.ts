// app/api/cron/refresh-mp-tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { refreshOrganizerMpToken } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verificación básica del header de autorización de Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Buscar organizadores cuyo token venza dentro de los próximos 15 días
    const fifteenDaysFromNow = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const expiringOrganizers = await prisma.organizer.findMany({
      where: {
        mercadopagoRefreshToken: { not: null },
        mercadopagoExpiresAt: { lte: fifteenDaysFromNow },
      },
      select: { id: true },
    });

    const results = {
      processed: expiringOrganizers.length,
      successCount: 0,
      failCount: 0,
    };

    for (const org of expiringOrganizers) {
      try {
        await refreshOrganizerMpToken(org.id);
        results.successCount++;
      } catch (err) {
        console.error(`[Cron Refresh Fail] ID: ${org.id}`, err);
        results.failCount++;
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('[Cron Refresh Exception]:', error);
    return NextResponse.json({ error: 'Error procesando la tarea de renovación' }, { status: 500 });
  }
}