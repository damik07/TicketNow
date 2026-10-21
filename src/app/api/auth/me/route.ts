import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { prisma } = await import('@/lib/db')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        avatar_url: true,
        provider: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 💡 1. CAPTURAMOS EL eventId DE LA URL (SI ES QUE VIENE)
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")

    let ticketsBought = 0
    const ticketsBoughtByTypeId: Record<string, number> = {}

    // 💡 2. SI VIENE EL eventId, BUSCAMOS LOS TICKETS DE ÓRDENES APROBADAS Y AGRUPAMOS POR TIPO
    if (eventId) {
      const userTickets = await prisma.ticket.findMany({
        where: {
          eventId: eventId,
          userId: user.id,
          order: {
            paymentStatus: "aprobado"
          }
        },
        select: {
          ticketTypeId: true
        }
      })

      ticketsBought = userTickets.length

      // Agrupamos la cantidad que el usuario compró para cada ticketTypeId
      for (const t of userTickets) {
        if (t.ticketTypeId) {
          ticketsBoughtByTypeId[t.ticketTypeId] = (ticketsBoughtByTypeId[t.ticketTypeId] || 0) + 1
        }
      }
    }

    // 💡 3. RETORNAMOS EL USUARIO, EL CONTADOR TOTAL Y EL DESGROSE POR TIPO DE TICKET
    return NextResponse.json({ 
      user, 
      ticketsBought,
      ticketsBoughtByTypeId
    })

  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}