import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { prisma } = await import('@/lib/prisma')
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

    // 💡 2. SI VIENE EL eventId, CONTAMOS LOS TICKETS CON ORDENES APROBADAS
    if (eventId) {
      ticketsBought = await prisma.ticket.count({
        where: {
          eventId: eventId,
          userId: user.id,
          order: {
            // Evaluamos usando el campo real de tu modelo Order
            // Recordá cambiar "aprobado" si usás otro string (ej: "completado", "paid")
            paymentStatus: "aprobado"
          }
        }
      })
    }

    // 💡 3. RETORNAMOS EL USUARIO Y EL CONTADOR AL CHECKOUT
    return NextResponse.json({ 
      user, 
      ticketsBought 
    })

  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}