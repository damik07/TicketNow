import { NextRequest, NextResponse } from 'next/server'
import { getQueueStatus } from '@/lib/queue'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawToken = searchParams.get('token')
    const eventId = searchParams.get('eventId')

    if (!rawToken || !eventId) {
      return NextResponse.json({ error: 'Parámetros insuficientes' }, { status: 400 })
    }

    const data = await getQueueStatus(rawToken, eventId)
    console.log('data', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error en queue/status:', error)
    return NextResponse.json(
      { status: 'waiting', currentPosition: null, totalWaiting: null },
      { status: 200 }
    )
  }
}
