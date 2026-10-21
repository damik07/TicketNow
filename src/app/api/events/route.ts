// app/api/events/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { normalizeUserRole, isAdminRole } from '@/lib/user-role'
import { parseLocalDate } from "@/utils/date";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const eventId = searchParams.get('eventId')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const admin = searchParams.get('admin')
    const organizerId = searchParams.get('organizerId')

    let isAdmin = false
    if (admin === 'true') {
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email }
        })
        
        if (user) {
          const role = normalizeUserRole(user.role)
          isAdmin = isAdminRole(role)
        }
      }
    }

    // 💡 1. Si viene eventId, traemos TODOS sus ticketTypes (incluso los agotados para mostrar "Agotado")
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
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              stockTotal: true,
              stockAvailable: true,
              maxPerUser: true,
              isPack: true,
              ticketsPerBundle: true,
              parentTicketTypeId: true,
            }
          },
          pack: true
        }
      })

      return NextResponse.json(event ? [event] : [])
    }

    // 💡 2. Consulta general de listados
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
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            price: true,
            stockAvailable: true,
            maxPerUser: true,
          }
        },
        pack: true
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

    const body = await request.json()
    const { 
      title, 
      description, 
      dateTime, 
      endDateTime, 
      locationName, 
      locationAddress, 
      locationLat, 
      locationLng, 
      latitude, 
      longitude, 
      category, 
      bannerUrl, 
      ticketTypes, 
      maxConcurrent, 
      queueActive 
    } = body

    if (!ticketTypes || !Array.isArray(ticketTypes) || ticketTypes.length === 0) {
      return NextResponse.json({ error: 'Debes incluir al menos un tipo de entrada.' }, { status: 400 })
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

    // 🚀 Normalización de coordenadas con soporte flotante estricto
    const rawLat = locationLat ?? latitude;
    const rawLng = locationLng ?? longitude;
    const parsedLat = (rawLat !== undefined && rawLat !== null && rawLat !== '') ? parseFloat(String(rawLat)) : null;
    const parsedLng = (rawLng !== undefined && rawLng !== null && rawLng !== '') ? parseFloat(String(rawLng)) : null;

    // SANITIZACIÓN: Mapeo y limpieza de valores numéricos
    const cleanTicketTypes = ticketTypes.map((t: any) => ({
      id: t.id,
      name: t.name || 'General',
      description: t.description || '',
      price: Number(t.price) || 0,
      stockTotal: Number(t.stock_total ?? t.stockTotal) || 0,
      maxPerUser: Number(t.max_per_user ?? t.maxPerUser) || 4,
      ticketsPerBundle: Number(t.tickets_per_bundle ?? t.ticketsPerBundle) || 1,
      isPack: Boolean(t.is_pack ?? t.isPack),
      parentTicketTypeId: t.parent_ticket_type_id ?? t.parentTicketTypeId ?? null,
    }))

    const minPrice = Math.min(...cleanTicketTypes.map(t => t.price))
    
    // Contamos aforo real (solo entradas base, sin contar los packs para no duplicar)
    const totalCapacity = cleanTicketTypes
      .filter(t => !t.isPack)
      .reduce((sum, t) => sum + t.stockTotal, 0)

    // Creación en 2 fases con transacción para soportar vincular Packs con Tickets Padre
    const createdEvent = await prisma.$transaction(async (tx) => {
      const newEvt = await tx.event.create({
        data: {
          organizerId: organizer.id,
          title,
          description,
          dateTime: parseLocalDate(dateTime)!,
          endDateTime: endDateTime ? parseLocalDate(endDateTime) : null,
          locationName,
          locationAddress,
          locationLat: parsedLat,
          locationLng: parsedLng,
          category,
          bannerUrl,
          status: 'borrador',
          minPrice,
          totalCapacity,
          maxConcurrent: Math.max(1, Number(maxConcurrent) || 50),
          queueActive: Boolean(queueActive),
        }
      });

      // FASE A: Crear Entradas Base (no packs)
      const baseTicketsMap = new Map<string, string>();

      for (let i = 0; i < cleanTicketTypes.length; i++) {
        const t = cleanTicketTypes[i];
        if (!t.isPack) {
          const createdBase = await tx.ticketType.create({
            data: {
              eventId: newEvt.id,
              name: t.name,
              description: t.description,
              price: t.price,
              stockTotal: t.stockTotal,
              stockAvailable: t.stockTotal,
              maxPerUser: t.maxPerUser,
              ticketsPerBundle: 1,
              isPack: false,
              sortOrder: i,
            }
          });
          const tempKey = t.id || t.name || `temp-${i}`;
          baseTicketsMap.set(tempKey, createdBase.id);
          baseTicketsMap.set(t.name, createdBase.id);
        }
      }

      // FASE B: Crear Combos/Packs asociando el parentTicketTypeId resuelto
      for (let i = 0; i < cleanTicketTypes.length; i++) {
        const t = cleanTicketTypes[i];
        if (t.isPack) {
          const resolvedParentId = t.parentTicketTypeId ? (baseTicketsMap.get(t.parentTicketTypeId) || null) : null;

          await tx.ticketType.create({
            data: {
              eventId: newEvt.id,
              name: t.name,
              description: t.description,
              price: t.price,
              stockTotal: t.stockTotal,
              stockAvailable: t.stockTotal,
              maxPerUser: t.maxPerUser,
              ticketsPerBundle: t.ticketsPerBundle,
              isPack: true,
              parentTicketTypeId: resolvedParentId,
              sortOrder: i,
            }
          });
        }
      }

      return tx.event.findUnique({
        where: { id: newEvt.id },
        include: { ticketTypes: true, organizer: true }
      });
    });

    return NextResponse.json(createdEvent)
  } catch (error) {
    console.error('Detailed Event creation error:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}