import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams // 👈 Tipamos correctamente como Promise
) {
  try {
    // 2. 🔑 LA SOLUCIÓN: Meté el await antes de desestructurar o leer las propiedades
    const { id: eventId } = await params

    if (!eventId) {
      return NextResponse.json({ error: 'Falta el ID del evento' }, { status: 400 })
    }

    // Buscamos los tipos de tickets que corresponden a consumiciones para este evento público
    const consumptionTypes = await prisma.ticketType.findMany({
      where: {
        eventId: eventId,
        // Filtramos usando la misma lógica semántica que en tu frontend
        OR: [
          { name: { contains: "consumicion", mode: "insensitive" } },
          { name: { contains: "consumición", mode: "insensitive" } },
          { name: { contains: "consumo", mode: "insensitive" } },
        ],
        // Filtro opcional por si querés ocultar las que se quedaron sin stock
        stockAvailable: {
          gt: 0
        }
      },
      orderBy: {
        sortOrder: 'asc'
      }
    })

    // Retornamos la lista directamente (pública para cualquier usuario autenticado o no)
    return NextResponse.json(consumptionTypes)
  } catch (error) {
    console.error('Error fetching public consumption types:', error)
    return NextResponse.json({ error: 'Failed to fetch consumption types' }, { status: 500 })
  }
}