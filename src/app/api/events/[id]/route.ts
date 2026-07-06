// ...app\api\events\[id]\route.tx

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { normalizeUserRole, isAdminRole, normalizeUserRole } from '@/lib/user-role' // 🚀 Cambiado
import { parseLocalDate } from "@/utils/date";

interface RouteParams {
  params: Promise<{ id: string }> | { id: string }; // Compatible con Next 14 y 15
}

export async function GET(
  request: NextRequest,
  context: any // 💡 Usar 'any' o desestructurar de forma asíncrona blinda el Build de Vercel
) {
  try {
    const session = await getServerSession(authOptions)
    // Para asegurarnos total compatibilidad con Next.js, resolvemos los params de forma segura:
    const params = await context.params; 
    const id = params.id;


    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Buscamos al usuario organizador
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    const organizer = await prisma.organizer.findUnique({
      where: { userId: user?.id }
    })

    if (!organizer) {
      return NextResponse.json({ error: 'User is not an organizer' }, { status: 403 })
    }

    // Buscamos el evento incluyendo sus categorías de tickets
    const event = await prisma.event.findUnique({
      where: {
        id: id,
        organizerId: organizer.id // Seguridad: solo el dueño puede leerlo para editar
      },
      include: {
        ticketTypes: true // Clave para rellenar la sección de entradas en el formulario
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Event GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch event data' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: any
) {
  try {
    const session = await getServerSession(authOptions)
    // Para asegurarnos total compatibilidad con Next.js, resolvemos los params de forma segura:
    const params = await context.params; 
    const id = params.id;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    

    // Check if the event belongs to this organizer
    const event = await prisma.event.findUnique({
      where: {
        id: id,
        organizerId: organizer.id
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Delete the event (this will also delete related ticket types due to cascade)
    await prisma.event.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Event DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: any
) {
  try {
    const session = await getServerSession(authOptions)
    // Para asegurarnos total compatibilidad con Next.js, resolvemos los params de forma segura:
    const params = await context.params; 
    const id = params.id;
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    const organizer = await prisma.organizer.findUnique({
      where: { userId: user?.id }
    })

    if (!organizer) {
      return NextResponse.json({ error: 'User is not an organizer' }, { status: 403 })
    }

    
    const { title, description, dateTime, endDateTime, locationName, locationAddress, category, bannerUrl, status, ticketTypes, maxConcurrent, queueActive } = await request.json()

    const existingEvent = await prisma.event.findUnique({
      where: {
        id: id,
        organizerId: organizer.id
      }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Calculamos minPrice y totalCapacity de forma dinámica si se actualizaron los tickets
    let minPrice = existingEvent.minPrice;
    let totalCapacity = existingEvent.totalCapacity;

    if (ticketTypes && Array.isArray(ticketTypes) && ticketTypes.length > 0) {
      const cleanPrices = ticketTypes.map((t: any) => Number(t.price) || 0);
      minPrice = Math.min(...cleanPrices);
      totalCapacity = ticketTypes.reduce((sum: number, t: any) => sum + (Number(t.stockTotal) || 0), 0);
    }

    // Usamos una transacción para actualizar el evento y refrescar las entradas
    const updatedEvent = await prisma.$transaction(async (tx) => {
      // 1. Si se enviaron tipos de ticket, borramos los existentes de este evento primero
      if (ticketTypes && Array.isArray(ticketTypes)) {
        await tx.ticketType.deleteMany({
          where: { eventId: id }
        })
      }

      // 2. Actualizamos el evento y creamos los nuevos tipos de ticket simultáneamente
      return await tx.event.update({
        where: { id: id },
        data: {
          title,
          description,
          // Aplica parseLocalDate para guardar las fechas exactas sin desfases UTC
          dateTime: dateTime ? parseLocalDate(dateTime)! : existingEvent.dateTime,
          endDateTime: endDateTime ? parseLocalDate(endDateTime) : existingEvent.endDateTime,
          locationName,
          locationAddress,
          category,
          bannerUrl,
          minPrice,
          totalCapacity,
          ...(maxConcurrent !== undefined && { maxConcurrent: Math.max(1, Number(maxConcurrent) || 50) }),
          ...(queueActive !== undefined && { queueActive: Boolean(queueActive) }),
          status: status || existingEvent.status,
          ticketTypes: ticketTypes && Array.isArray(ticketTypes) ? {
            create: ticketTypes.map((tt: any, index: number) => ({
              name: tt.name,
              description: tt.description || '',
              price: Number(tt.price) || 0,
              stockTotal: Number(tt.stockTotal) || 0,
              stockAvailable: Number(tt.stockTotal) || 0, // Reinicializa stock con la edición
              maxPerUser: Number(tt.maxPerUser) || 4,
              sortOrder: index
            }))
          } : undefined
        },
        include: {
          ticketTypes: true
        }
      })
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Event PUT error:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: any // 💡 Usar 'any' o desestructurar de forma asíncrona blinda el Build de Vercel
) {
  try {
    const session = await getServerSession(authOptions)
    // Para asegurarnos total compatibilidad con Next.js, resolvemos los params de forma segura:
    const params = await context.params; 
    const id = params.id;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user by email first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || !isAdminRole(normalizeUserRole(user.role))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { packId } = await request.json()
    

    const updatedEvent = await prisma.event.update({
      where: { id: id },
      data: {
        packId: packId
      },
      select: {
        id: true,
        title: true,
        locationName: true,
        status: true,
        packId: true
      }
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Event pack assignment error:', error)
    return NextResponse.json({ error: 'Failed to assign pack' }, { status: 500 })
  }
}
