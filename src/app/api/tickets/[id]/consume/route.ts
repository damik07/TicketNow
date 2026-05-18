import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/lib/permissions'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user by email first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to process consumptions (staff, organizer, or admin)
    if (!['STAFF', 'ORGANIZER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const ticketId = params.id
    const { amount } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Find ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          select: {
            title: true
          }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if ticket has consumption balance
    if (ticket.consumptionBalance === null || ticket.consumptionBalance === undefined) {
      return NextResponse.json({ error: 'Ticket does not have consumption balance' }, { status: 400 })
    }

    const currentBalance = ticket.consumptionBalance

    // Check if sufficient balance
    if (currentBalance < amount) {
      return NextResponse.json({ 
        error: 'Insufficient balance',
        deficit: amount - currentBalance,
        currentBalance 
      }, { status: 400 })
    }

    const newBalance = currentBalance - amount

    // Update ticket consumption balance and create transaction record
    const [updatedTicket] = await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticketId },
        data: {
          consumptionBalance: newBalance,
          updatedAt: new Date()
        },
        select: {
          id: true,
          qrCode: true,
          ticketTypeName: true,
          eventTitle: true,
          consumptionBalance: true,
          consumptionInitial: true
        }
      }),
      prisma.consumptionTransaction.create({
        data: {
          ticketId: ticketId,
          userId: ticket.userId,
          eventId: ticket.eventId,
          eventTitle: ticket.eventTitle,
          ticketTypeName: ticket.ticketTypeName,
          type: 'debito',
          amount: amount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description: `Consumo procesado por ${user.full_name || user.email}`
        }
      })
    ])

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      amount,
      newBalance,
      message: `Consumo de $${amount.toFixed(2)} procesado correctamente. Saldo restante: $${newBalance.toFixed(2)}`
    })
  } catch (error) {
    console.error('Consumption processing error:', error)
    return NextResponse.json({ error: 'Failed to process consumption' }, { status: 500 })
  }
}
