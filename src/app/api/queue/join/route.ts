import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { joinQueue } from '@/lib/queue'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { eventId } = await request.json()
    if (!eventId) {
      return NextResponse.json({ error: 'Falta el ID del evento' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const result = await joinQueue(eventId, user.id)

    if (result.action === 'rejected_limit_reached') {
      return NextResponse.json(result, { status: 403 })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'EVENT_NOT_FOUND') {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }
    console.error('Error en queue/join:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
