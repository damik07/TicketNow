import { prisma } from '@/lib/db'
import { Ticket, TicketType, ConsumptionTransaction } from '@prisma/client'

export interface CreateTicketInput {
  orderId: string
  ticketTypeId: string
  eventId: string
  userId: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  ticketTypeName: string
  qrCode: string
  holderName: string
  holderEmail: string
  consumptionBalance?: number
  consumptionInitial?: number
}

export interface UpdateTicketInput {
  usageStatus?: string
  consumptionBalance?: number
  holderName?: string
  holderEmail?: string
}

export interface CreateTicketTypeInput {
  eventId: string
  name: string
  description?: string | null
  price: number
  stockTotal: number
  stockAvailable: number
  maxPerUser?: number
  sortOrder?: number
}

export interface UpdateTicketTypeInput {
  name?: string
  description?: string | null
  price?: number
  stockTotal?: number
  stockAvailable?: number
  maxPerUser?: number
  sortOrder?: number
}

export interface CreateConsumptionTransactionInput {
  ticketId: string
  userId: string
  eventId: string
  eventTitle: string
  ticketTypeName: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description?: string | null
}

export class TicketCRUD {
  // Create ticket
  static async createTicket(data: CreateTicketInput): Promise<Ticket> {
    return await prisma.ticket.create({
      data,
      include: {
        order: true,
        ticketType: true,
        event: true,
        user: true,
      },
    })
  }

  // Get ticket by ID
  static async getById(id: string): Promise<Ticket | null> {
    return await prisma.ticket.findUnique({
      where: { id },
      include: {
        order: true,
        ticketType: true,
        event: true,
        user: true,
        consumptionTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  // Get ticket by QR code
  static async getByQrCode(qrCode: string): Promise<Ticket | null> {
    return await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        order: true,
        ticketType: true,
        event: true,
        user: true,
        consumptionTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  // Get tickets by user
  static async getByUser(
    userId: string,
    options?: {
      page?: number
      limit?: number
      status?: string
      eventId?: string
    }
  ): Promise<{ tickets: Ticket[]; total: number }> {
    const { page = 1, limit = 20, status, eventId } = options || {}
    const skip = (page - 1) * limit

    const where = {
      userId,
      ...(status && { usageStatus: status }),
      ...(eventId && { eventId }),
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: true,
          ticketType: true,
          event: true,
        },
      }),
      prisma.ticket.count({ where }),
    ])

    return { tickets, total }
  }

  // Get tickets by event
  static async getByEvent(
    eventId: string,
    options?: {
      page?: number
      limit?: number
      status?: string
    }
  ): Promise<{ tickets: Ticket[]; total: number }> {
    const { page = 1, limit = 20, status } = options || {}
    const skip = (page - 1) * limit

    const where = {
      eventId,
      ...(status && { usageStatus: status }),
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: true,
          ticketType: true,
          event: true,
          user: true,
        },
      }),
      prisma.ticket.count({ where }),
    ])

    return { tickets, total }
  }

  // Update ticket
  static async updateTicket(id: string, data: UpdateTicketInput): Promise<Ticket> {
    return await prisma.ticket.update({
      where: { id },
      data,
      include: {
        order: true,
        ticketType: true,
        event: true,
        user: true,
      },
    })
  }

  // Update ticket usage status
  static async updateUsageStatus(id: string, status: string): Promise<Ticket> {
    return await prisma.ticket.update({
      where: { id },
      data: { usageStatus: status },
      include: {
        order: true,
        ticketType: true,
        event: true,
        user: true,
      },
    })
  }

  // Delete ticket
  static async deleteTicket(id: string): Promise<Ticket> {
    return await prisma.ticket.delete({
      where: { id },
    })
  }

  // Create ticket type
  static async createTicketType(data: CreateTicketTypeInput): Promise<TicketType> {
    return await prisma.ticketType.create({
      data,
      include: {
        event: true,
        tickets: true,
      },
    })
  }

  // Get ticket type by ID
  static async getTicketTypeById(id: string): Promise<TicketType | null> {
    return await prisma.ticketType.findUnique({
      where: { id },
      include: {
        event: true,
        tickets: true,
      },
    })
  }

  // Get ticket types by event
  static async getTicketTypesByEvent(
    eventId: string
  ): Promise<TicketType[]> {
    return await prisma.ticketType.findMany({
      where: { eventId },
      orderBy: { sortOrder: 'asc' },
      include: {
        event: true,
        tickets: true,
      },
    })
  }

  // Update ticket type
  static async updateTicketType(
    id: string,
    data: UpdateTicketTypeInput
  ): Promise<TicketType> {
    return await prisma.ticketType.update({
      where: { id },
      data,
      include: {
        event: true,
        tickets: true,
      },
    })
  }

  // Update ticket type stock
  static async updateStock(
    id: string,
    stockAvailable: number
  ): Promise<TicketType> {
    return await prisma.ticketType.update({
      where: { id },
      data: { stockAvailable },
    })
  }

  // Delete ticket type
  static async deleteTicketType(id: string): Promise<TicketType> {
    return await prisma.ticketType.delete({
      where: { id },
    })
  }

  // Get ticket statistics
  static async getStats(eventId?: string): Promise<{
    total: number
    used: number
    unused: number
    byStatus: Record<string, number>
  }> {
    const where = eventId ? { eventId } : {}

    const [total, used, unused, byStatus] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: { ...where, usageStatus: 'usado' } }),
      prisma.ticket.count({ where: { ...where, usageStatus: 'no_usado' } }),
      prisma.ticket.groupBy({
        by: ['usageStatus'],
        where,
        _count: true,
      }),
    ])

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.usageStatus] = item._count
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      used,
      unused,
      byStatus: statusCounts,
    }
  }

  // Get tickets by date range
  static async getByDateRange(
    startDate: Date,
    endDate: Date,
    options?: {
      page?: number
      limit?: number
      eventId?: string
    }
  ): Promise<{ tickets: Ticket[]; total: number }> {
    const { page = 1, limit = 20, eventId } = options || {}
    const skip = (page - 1) * limit

    const where = {
      eventDate: {
        gte: startDate.toISOString(),
        lte: endDate.toISOString(),
      },
      ...(eventId && { eventId }),
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: true,
          ticketType: true,
          event: true,
          user: true,
        },
      }),
      prisma.ticket.count({ where }),
    ])

    return { tickets, total }
  }

  // Create consumption transaction
  static async createConsumptionTransaction(data: CreateConsumptionTransactionInput): Promise<ConsumptionTransaction> {
    return await prisma.consumptionTransaction.create({
      data,
      include: {
        ticket: true,
        user: true,
      },
    })
  }
}
