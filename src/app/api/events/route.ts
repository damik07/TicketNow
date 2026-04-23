import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const category = searchParams.get('category')
    const status = searchParams.get('status') || 'publicado'

    const events = await prisma.event.findMany({
      where: {
        status,
        ...(category && { category }),
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
        }
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
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, dateTime, endDateTime, locationName, locationAddress, locationLat, locationLng, category, bannerUrl, ticketTypes } = await request.json()

    // Check if user is an organizer
    const organizer = await prisma.organizer.findUnique({
      where: { userId: session.user.id }
    })

    if (!organizer) {
      return NextResponse.json({ error: 'User is not an organizer' }, { status: 403 })
    }

    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title,
        description,
        dateTime: new Date(dateTime),
        endDateTime: endDateTime ? new Date(endDateTime) : null,
        locationName,
        locationAddress,
        locationLat,
        locationLng,
        category,
        bannerUrl,
        status: 'borrador',
        minPrice: Math.min(...ticketTypes.map((t: any) => t.price)),
        totalCapacity: ticketTypes.reduce((sum: number, t: any) => sum + t.stockTotal, 0),
        ticketTypes: {
          create: ticketTypes.map((t: any, index: number) => ({
            name: t.name,
            description: t.description,
            price: t.price,
            stockTotal: t.stockTotal,
            stockAvailable: t.stockTotal,
            maxPerUser: t.maxPerUser || 4,
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
    console.error('Event creation error:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
