import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const QUEUE_THRESHOLD = 3;
const ADMIT_BATCH = 2;
const ADMIT_INTERVAL = 15000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const eventId = searchParams.get('eventId')
    const status = searchParams.get('status') || 'waiting'

    const queueEntries = await prisma.queueEntry.findMany({
      where: {
        ...(eventId && { eventId }),
        status,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
          }
        },
        event: {
          select: {
            title: true,
            dateTime: true,
          }
        }
      },
      orderBy: { position: 'asc' }
    })

    return NextResponse.json(queueEntries)
  } catch (error) {
    console.error('Queue GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, sessionToken } = await request.json()

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Count current waiting users
    const allWaiting = await prisma.queueEntry.findMany({
      where: {
        eventId,
        status: 'waiting'
      }
    })

    const nextPos = allWaiting.length + 1

    // Check if user already has an entry
    const existingEntry = await prisma.queueEntry.findFirst({
      where: {
        eventId,
        userId: session.user.id,
        sessionToken,
      }
    })

    if (existingEntry) {
      return NextResponse.json(existingEntry)
    }

    const queueEntry = await prisma.queueEntry.create({
      data: {
        eventId,
        userId: session.user.id,
        sessionToken,
        position: nextPos,
        status: 'waiting',
      },
      include: {
        user: true,
        event: true
      }
    })

    return NextResponse.json(queueEntry)
  } catch (error) {
    console.error('Queue entry error:', error)
    return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const entryId = searchParams.get('id')
    const session = await getServerSession(authOptions, request)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status, admittedAt, expiresAt } = await request.json()

    const updatedEntry = await prisma.queueEntry.update({
      where: { id: entryId },
      data: {
        status,
        admittedAt: admittedAt ? new Date(admittedAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      }
    })

    return NextResponse.json(updatedEntry)
  } catch (error) {
    console.error('Queue update error:', error)
    return NextResponse.json({ error: 'Failed to update queue' }, { status: 500 })
  }
}
