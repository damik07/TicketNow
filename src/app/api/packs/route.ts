import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user by email first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const packs = await prisma.eventPack.findMany({
      include: {
        events: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(packs)
  } catch (error) {
    console.error('Packs GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch packs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { name, description, hasPhysicalTickets, hasDigitalTickets, hasQrValidation, hasConsumptions, hasStaffManagement, commissionType, commissionTickets, commissionConsumptions } = await request.json()

    const pack = await prisma.eventPack.create({
      data: {
        name,
        description,
        hasPhysicalTickets,
        hasDigitalTickets,
        hasQrValidation,
        hasConsumptions,
        hasStaffManagement,
        commissionType,
        commissionTickets,
        commissionConsumptions,
        isActive: true,
      }
    })

    return NextResponse.json(pack)
  } catch (error) {
    console.error('Pack creation error:', error)
    return NextResponse.json({ error: 'Failed to create pack' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url!)
    const packId = searchParams.get('id')
    
    if (!packId) {
      return NextResponse.json({ error: 'Pack ID required' }, { status: 400 })
    }

    const { name, description, hasPhysicalTickets, hasDigitalTickets, hasQrValidation, hasConsumptions, hasStaffManagement, commissionType, commissionTickets, commissionConsumptions, isActive } = await request.json()

    const updatedPack = await prisma.eventPack.update({
      where: { id: packId },
      data: {
        name,
        description,
        hasPhysicalTickets,
        hasDigitalTickets,
        hasQrValidation,
        hasConsumptions,
        hasStaffManagement,
        commissionType,
        commissionTickets,
        commissionConsumptions,
        isActive,
      }
    })

    return NextResponse.json(updatedPack)
  } catch (error) {
    console.error('Pack update error:', error)
    return NextResponse.json({ error: 'Failed to update pack' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions, request)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url!)
    const packId = searchParams.get('id')
    
    if (!packId) {
      return NextResponse.json({ error: 'Pack ID required' }, { status: 400 })
    }

    await prisma.eventPack.delete({
      where: { id: packId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Pack deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete pack' }, { status: 500 })
  }
}
