// ...app\api\events\route.tx

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@/lib/permissions'
import { parseLocalDate } from "@/utils/date";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const eventId = searchParams.get('eventId') // 💡 1. Capturamos el eventId que manda el Checkout
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const admin = searchParams.get('admin')
    const organizerId = searchParams.get('organizerId')

    // Check if user is admin for admin access
    let isAdmin = false
    if (admin === 'true') {
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email }
        })
        isAdmin = user?.role === UserRole.ADMIN
      }
    }

    // 💡 2. Si viene un eventId, buscamos ESE evento único con su paquete de comisiones
    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          organizer: {
            select: {
              businessName: true,
              logoUrl: true,
            }
          },
          ticketTypes: {
            where: { stockAvailable: { gt: 0 } },
            select: {
              id: true,
              name: true,
              price: true,
              stockAvailable: true,
            }
          },
          pack: true // 💡 CLAVE: Traemos el paquete de comisiones asignado al evento
        }
      })

      // El frontend espera un array (por tu lógica `eventData[0]`), así que lo envolvemos si existe
      return NextResponse.json(event ? [event] : [])
    }

    // 💡 3. Si NO viene eventId, el flujo sigue exactamente igual que antes para los listados
    const events = await prisma.event.findMany({
      where: {
        ...(status && { status }),
        ...(category && { category }),
        ...(organizerId && { organizerId }),
        ...(!isAdmin && !organizerId && !status && { status: 'publicado' })
      },
      include: {
        organizer: {
          select: {
            businessName: true,
            logoUrl: true,
          }
        },
        ticketTypes: {
          where: { stockAvailable: { gt: 0 } },
          select: {
            id: true,
            name: true,
            price: true,
            stockAvailable: true,
          }
        },
        pack: true // De paso lo incluimos acá por si lo necesitas en los listados
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Events GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, dateTime, endDateTime, locationName, locationAddress, locationLat, locationLng, category, bannerUrl, ticketTypes, maxConcurrent, queueActive } = await request.json()

    // Validación preventiva: Si no mandan tickets, evitamos que rompa el flujo
    if (!ticketTypes || !Array.isArray(ticketTypes) || ticketTypes.length === 0) {
      return NextResponse.json({ error: 'Debes incluir al menos un tipo de entrada.' }, { status: 400 })
    }

    // Check if user is an organizer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    const organizer = await prisma.organizer.findUnique({
      where: { userId: user?.id }
    })

    if (!organizer) {
      return NextResponse.json({ error: 'User is not an organizer' }, { status: 403 })
    }

    // SANITIZACIÓN: Aseguramos que price y stockTotal sean números válidos siempre
    const cleanTicketTypes = ticketTypes.map((t: any) => ({
      name: t.name || 'General',
      description: t.description || '',
      price: Number(t.price) || 0,
      stockTotal: Number(t.stockTotal) || 0,
      maxPerUser: Number(t.maxPerUser) || 4
    }))

    // Ahora calculamos de forma 100% segura sobre el array limpio
    const minPrice = Math.min(...cleanTicketTypes.map(t => t.price))
    const totalCapacity = cleanTicketTypes.reduce((sum, t) => sum + t.stockTotal, 0)

    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title,
        description,
        dateTime: parseLocalDate(dateTime)!,
        endDateTime: endDateTime ? parseLocalDate(endDateTime) : null,
        locationName,
        locationAddress,
        locationLat,
        locationLng,
        category,
        bannerUrl,
        status: 'borrador',
        minPrice: minPrice,
        totalCapacity: totalCapacity,
        maxConcurrent: Math.max(1, Number(maxConcurrent) || 50),
        queueActive: Boolean(queueActive),
        ticketTypes: {
          create: cleanTicketTypes.map((t, index) => ({
            name: t.name,
            description: t.description,
            price: t.price,
            stockTotal: t.stockTotal,
            stockAvailable: t.stockTotal, // Inicializa con el total
            maxPerUser: t.maxPerUser,
            sortOrder: index,
          }))
        }
      },
      include: {
        ticketTypes: true,
        organizer: true
      }
    })

    return NextResponse.json(event)
  } catch (error) {
    // IMPORTANTE: Mira tu consola de la terminal para ver el error exacto si vuelve a fallar
    console.error('Detailed Event creation error:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}

