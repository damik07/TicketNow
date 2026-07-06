import { NextRequest, NextResponse } from 'next/server'
import { processAdmissions } from '@/lib/queue'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json()
    if (!eventId) {
      return NextResponse.json({ error: 'Falta el ID del evento' }, { status: 400 })
    }

    const result = await processAdmissions(eventId)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error en queue/admit:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
