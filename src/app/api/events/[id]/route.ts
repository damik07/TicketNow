import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/lib/permissions'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
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

    const eventId = params.id

    // Check if the event belongs to this organizer
    const event = await prisma.event.findUnique({
      where: { 
        id: eventId,
        organizerId: organizer.id 
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Delete the event (this will also delete related ticket types due to cascade)
    await prisma.event.delete({
      where: { id: eventId }
    })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Event DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
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

    const eventId = params.id
    const { title, description, dateTime, endDateTime, locationName, locationAddress, category, bannerUrl, status } = await request.json()

    // Check if the event belongs to this organizer
    const existingEvent = await prisma.event.findUnique({
      where: { 
        id: eventId,
        organizerId: organizer.id 
      }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        description,
        dateTime: dateTime ? new Date(dateTime) : existingEvent.dateTime,
        endDateTime: endDateTime ? new Date(endDateTime) : existingEvent.endDateTime,
        locationName,
        locationAddress,
        category,
        bannerUrl,
        status: status || existingEvent.status
      }
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Event PUT error:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user by email first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { packId } = await request.json()
    const eventId = params.id

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
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
