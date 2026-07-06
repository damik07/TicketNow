// app/api/tickets/types/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Buscamos los tipos de entrada creados para este evento en Neon
    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId },
      orderBy: { sortOrder: 'asc' } // O el campo que uses para ordenar
    });

    return NextResponse.json(ticketTypes);
  } catch (error) {
    console.error('TicketTypes GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch ticket types' }, { status: 500 });
  }
}