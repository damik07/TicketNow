import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const userId = searchParams.get('userId')
    const ticketId = searchParams.get('ticketId')

    const transactions = await prisma.consumptionTransaction.findMany({
      where: {
        ...(userId && { userId }),
        ...(ticketId && { ticketId }),
      },
      include: {
        ticket: {
          select: {
            id: true,
            qrCode: true,
            ticketTypeName: true,
            eventTitle: true,
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Consumption transactions GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch consumption transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId, amount, description, type } = await request.json()

    // Get ticket and verify ownership
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    })

    if (!ticket || ticket.userId !== session.user.id) {
      return NextResponse.json({ error: 'Ticket not found or unauthorized' }, { status: 404 })
    }

    const currentBalance = ticket.consumptionBalance || 0

    if (type === 'debito') {
      if (currentBalance < amount) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
      }
    }

    const newBalance = currentBalance - (type === 'debito' ? amount : -amount)

    // Update ticket balance
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        consumptionBalance: newBalance,
        usageStatus: newBalance <= 0 ? 'consumido' : 'parcial',
      }
    })

    // Create transaction
    const transaction = await prisma.consumptionTransaction.create({
      data: {
        ticketId,
        userId: session.user.id,
        eventId: ticket.eventId,
        eventTitle: ticket.eventTitle,
        ticketTypeName: ticket.ticketTypeName,
        type,
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: description || `${type === 'debito' ? 'Consumo en evento' : 'Carga de saldo'}`,
      }
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Consumption transaction error:', error)
    return NextResponse.json({ error: 'Failed to process consumption transaction' }, { status: 500 })
  }
}
