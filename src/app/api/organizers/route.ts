import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const userId = searchParams.get('userId')

    const organizers = await prisma.organizer.findMany({
      where: {
        ...(userId && { userId }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
          }
        },
        events: {
          where: { status: 'publicado' },
          select: {
            id: true,
            title: true,
            status: true,
            dateTime: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(organizers)
  } catch (error) {
    console.error('Organizers GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch organizers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessName, fiscalId, bankAccount, phone, logoUrl } = await request.json()

    // Check if user already has an organizer account
    const existingOrganizer = await prisma.organizer.findUnique({
      where: { userId: session.user.id }
    })

    if (existingOrganizer) {
      return NextResponse.json({ error: 'User already has an organizer account' }, { status: 400 })
    }

    const organizer = await prisma.organizer.create({
      data: {
        userId: session.user.id,
        businessName,
        fiscalId,
        bankAccount,
        phone,
        logoUrl,
        verified: false,
      }
    })

    return NextResponse.json(organizer)
  } catch (error) {
    console.error('Organizer creation error:', error)
    return NextResponse.json({ error: 'Failed to create organizer' }, { status: 500 })
  }
}
