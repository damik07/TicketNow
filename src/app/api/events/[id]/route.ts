// app/api/events/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { normalizeUserRole, isAdminRole } from '@/lib/user-role'
import { parseLocalDate } from "@/utils/date";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const session = await getServerSession(authOptions)
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

    const event = await prisma.event.findUnique({
      where: {
        id: id,
        organizerId: organizer.id
      },
      include: {
        ticketTypes: true
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

    const event = await prisma.event.findUnique({
      where: {
        id: id,
        organizerId: organizer.id
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

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

    const { 
      title, 
      description, 
      dateTime, 
      endDateTime, 
      locationName, 
      locationAddress, 
      category, 
      bannerUrl, 
      status, 
      ticketTypes, 
      maxConcurrent, 
      queueActive 
    } = await request.json()

    const existingEvent = await prisma.event.findUnique({
      where: {
        id: id,
        organizerId: organizer.id
      }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    let minPrice = existingEvent.minPrice;
    let totalCapacity = existingEvent.totalCapacity;

    if (ticketTypes && Array.isArray(ticketTypes) && ticketTypes.length > 0) {
      const cleanPrices = ticketTypes.map((t: any) => Number(t.price) || 0);
      minPrice = Math.min(...cleanPrices);
      
      // Contamos capacidad total sin duplicar stock de packs
      totalCapacity = ticketTypes
        .filter((t: any) => !t.is_pack && !t.isPack)
        .reduce((sum: number, t: any) => sum + (Number(t.stock_total || t.stockTotal) || 0), 0);
    }

    const updatedEvent = await prisma.$transaction(async (tx) => {
      // 1. Actualizamos los campos base del evento
      const evt = await tx.event.update({
        where: { id: id },
        data: {
          title,
          description,
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
        }
      });

      // 2. Si vienen ticketTypes, regeneramos los tipos de ticket vinculando correctamente
      if (ticketTypes && Array.isArray(ticketTypes)) {
        await tx.ticketType.deleteMany({
          where: { eventId: id }
        });

        // FASE A: Crear primero los tickets Base (los que no son packs)
        const baseTicketsMap = new Map<string, string>(); // Guarda relación TempID -> RealID

        for (let i = 0; i < ticketTypes.length; i++) {
          const tt = ticketTypes[i];
          const isPack = Boolean(tt.is_pack || tt.isPack);

          if (!isPack) {
            const createdBase = await tx.ticketType.create({
              data: {
                eventId: id,
                name: tt.name,
                description: tt.description || '',
                price: Number(tt.price) || 0,
                stockTotal: Number(tt.stock_total || tt.stockTotal) || 0,
                stockAvailable: Number(tt.stock_total || tt.stockTotal) || 0,
                maxPerUser: Number(tt.max_per_user || tt.maxPerUser) || 4,
                ticketsPerBundle: 1,
                isPack: false,
                sortOrder: i,
              }
            });

            // Guardamos identificadores temporales para que los packs puedan hacer referencia
            const tempKey = tt.id || tt.name || `temp-${i}`;
            baseTicketsMap.set(tempKey, createdBase.id);
            baseTicketsMap.set(tt.name, createdBase.id);
          }
        }

        // FASE B: Crear los Packs/Combos vinculándolos a su correspondiente Ticket Padre
        for (let i = 0; i < ticketTypes.length; i++) {
          const tt = ticketTypes[i];
          const isPack = Boolean(tt.is_pack || tt.isPack);

          if (isPack) {
            const rawParentId = tt.parent_ticket_type_id || tt.parentTicketTypeId;
            const resolvedParentId = rawParentId ? (baseTicketsMap.get(rawParentId) || null) : null;

            await tx.ticketType.create({
              data: {
                eventId: id,
                name: tt.name,
                description: tt.description || '',
                price: Number(tt.price) || 0,
                stockTotal: Number(tt.stock_total || tt.stockTotal) || 0,
                stockAvailable: Number(tt.stock_total || tt.stockTotal) || 0,
                maxPerUser: Number(tt.max_per_user || tt.maxPerUser) || 4,
                ticketsPerBundle: Number(tt.tickets_per_bundle || tt.ticketsPerBundle) || 1,
                isPack: true,
                parentTicketTypeId: resolvedParentId,
                sortOrder: i,
              }
            });
          }
        }
      }

      return await tx.event.findUnique({
        where: { id: id },
        include: { ticketTypes: true }
      });
    });

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Event PUT error:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: any) {
  try {
    const session = await getServerSession(authOptions)
    const params = await context.params; 
    const id = params.id;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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