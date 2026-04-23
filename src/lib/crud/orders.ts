import { prisma } from '@/lib/db'
import { Order, OrderItem } from '@prisma/client'

export interface CreateOrderInput {
  userId: string
  userEmail: string
  userName: string
  eventId: string
  eventTitle: string
  totalAmount: number
  paymentStatus?: string
  externalTransactionId?: string | null
  paymentMethod?: string | null
  items: {
    ticketTypeId: string
    ticketTypeName: string
    quantity: number
    unitPrice: number
    subtotal: number
  }[]
}

export interface UpdateOrderInput {
  paymentStatus?: string
  externalTransactionId?: string | null
  paymentMethod?: string | null
}

export class OrderCRUD {
  // Create order with items
  static async create(data: CreateOrderInput): Promise<Order> {
    return await prisma.order.create({
      data: {
        userId: data.userId,
        userEmail: data.userEmail,
        userName: data.userName,
        eventId: data.eventId,
        eventTitle: data.eventTitle,
        totalAmount: data.totalAmount,
        paymentStatus: data.paymentStatus || 'pendiente',
        externalTransactionId: data.externalTransactionId,
        paymentMethod: data.paymentMethod,
        items: {
          create: data.items,
        },
      },
      include: {
        user: true,
        event: true,
        items: {
          include: {
            ticketType: true,
          },
        },
        tickets: true,
      },
    })
  }

  // Get order by ID
  static async getById(id: string): Promise<Order | null> {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        event: true,
        items: {
          include: {
            ticketType: true,
          },
        },
        tickets: true,
      },
    })
  }

  // Get orders by user
  static async getByUser(
    userId: string,
    options?: {
      page?: number
      limit?: number
      paymentStatus?: string
      eventId?: string
    }
  ): Promise<{ orders: Order[]; total: number }> {
    const { page = 1, limit = 20, paymentStatus, eventId } = options || {}
    const skip = (page - 1) * limit

    const where = {
      userId,
      ...(paymentStatus && { paymentStatus }),
      ...(eventId && { eventId }),
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          event: true,
          items: {
            include: {
              ticketType: true,
            },
          },
          tickets: true,
        },
      }),
      prisma.order.count({ where }),
    ])

    return { orders, total }
  }

  // Get orders by event
  static async getByEvent(
    eventId: string,
    options?: {
      page?: number
      limit?: number
      paymentStatus?: string
    }
  ): Promise<{ orders: Order[]; total: number }> {
    const { page = 1, limit = 20, paymentStatus } = options || {}
    const skip = (page - 1) * limit

    const where = {
      eventId,
      ...(paymentStatus && { paymentStatus }),
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          event: true,
          items: {
            include: {
              ticketType: true,
            },
          },
          tickets: true,
        },
      }),
      prisma.order.count({ where }),
    ])

    return { orders, total }
  }

  // Get all orders (admin)
  static async getAll(options?: {
    page?: number
    limit?: number
    paymentStatus?: string
    eventId?: string
    userId?: string
    search?: string
  }): Promise<{ orders: Order[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      paymentStatus,
      eventId,
      userId,
      search,
    } = options || {}
    const skip = (page - 1) * limit

    const where = {
      ...(paymentStatus && { paymentStatus }),
      ...(eventId && { eventId }),
      ...(userId && { userId }),
      ...(search && {
        OR: [
          { userEmail: { contains: search, mode: 'insensitive' as const } },
          { userName: { contains: search, mode: 'insensitive' as const } },
          { eventTitle: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          event: true,
          items: {
            include: {
              ticketType: true,
            },
          },
          tickets: true,
        },
      }),
      prisma.order.count({ where }),
    ])

    return { orders, total }
  }

  // Update order
  static async update(id: string, data: UpdateOrderInput): Promise<Order> {
    return await prisma.order.update({
      where: { id },
      data,
      include: {
        user: true,
        event: true,
        items: {
          include: {
            ticketType: true,
          },
        },
        tickets: true,
      },
    })
  }

  // Update payment status
  static async updatePaymentStatus(
    id: string,
    paymentStatus: string
  ): Promise<Order> {
    return await prisma.order.update({
      where: { id },
      data: { paymentStatus },
      include: {
        user: true,
        event: true,
        items: {
          include: {
            ticketType: true,
          },
        },
        tickets: true,
      },
    })
  }

  // Approve payment and generate tickets
  static async approvePayment(id: string): Promise<Order> {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!order) throw new Error('Order not found')
    if (order.paymentStatus === 'aprobado') throw new Error('Order already approved')

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { paymentStatus: 'aprobado' },
      include: {
        user: true,
        event: true,
        items: {
          include: {
            ticketType: true,
          },
        },
        tickets: true,
      },
    })

    // Generate tickets
    const tickets = await Promise.all(
      order.items.map(async (item) => {
        const tickets = []
        for (let i = 0; i < item.quantity; i++) {
          const qrCode = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          tickets.push({
            orderId: order.id,
            ticketTypeId: item.ticketTypeId,
            eventId: order.eventId,
            userId: order.userId,
            eventTitle: order.eventTitle,
            eventDate: new Date().toISOString(),
            eventLocation: 'Event Location', // Would get from event
            ticketTypeName: item.ticketTypeName,
            qrCode,
            holderName: order.userName,
            holderEmail: order.userEmail,
          })
        }
        return tickets
      })
    )

    const allTickets = tickets.flat()
    await prisma.ticket.createMany({
      data: allTickets,
    })

    return updatedOrder
  }

  // Reject payment
  static async rejectPayment(id: string): Promise<Order> {
    return await prisma.order.update({
      where: { id },
      data: { paymentStatus: 'rechazado' },
      include: {
        user: true,
        event: true,
        items: {
          include: {
            ticketType: true,
          },
        },
        tickets: true,
      },
    })
  }

  // Refund order
  static async refund(id: string): Promise<Order> {
    return await prisma.order.update({
      where: { id },
      data: { paymentStatus: 'reembolsado' },
      include: {
        user: true,
        event: true,
        items: {
          include: {
            ticketType: true,
          },
        },
        tickets: true,
      },
    })
  }

  // Delete order
  static async delete(id: string): Promise<Order> {
    return await prisma.order.delete({
      where: { id },
      include: {
        items: true,
        tickets: true,
      },
    })
  }

  // Get order statistics
  static async getStats(options?: {
    eventId?: string
    startDate?: Date
    endDate?: Date
  }): Promise<{
    total: number
    approved: number
    pending: number
    rejected: number
    refunded: number
    totalRevenue: number
    approvedRevenue: number
  }> {
    const { eventId, startDate, endDate } = options || {}

    const dateFilter = {
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      }),
    }

    const where = {
      ...(eventId && { eventId }),
      ...dateFilter,
    }

    const [
      total,
      approved,
      pending,
      rejected,
      refunded,
      totalRevenue,
      approvedRevenue,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, paymentStatus: 'aprobado' } }),
      prisma.order.count({ where: { ...where, paymentStatus: 'pendiente' } }),
      prisma.order.count({ where: { ...where, paymentStatus: 'rechazado' } }),
      prisma.order.count({ where: { ...where, paymentStatus: 'reembolsado' } }),
      prisma.order.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: 'aprobado' },
        _sum: { totalAmount: true },
      }),
    ])

    return {
      total,
      approved,
      pending,
      rejected,
      refunded,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      approvedRevenue: approvedRevenue._sum.totalAmount || 0,
    }
  }

  // Get orders by date range
  static async getByDateRange(
    startDate: Date,
    endDate: Date,
    options?: {
      page?: number
      limit?: number
      eventId?: string
    }
  ): Promise<{ orders: Order[]; total: number }> {
    const { page = 1, limit = 20, eventId } = options || {}
    const skip = (page - 1) * limit

    const where = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(eventId && { eventId }),
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          event: true,
          items: {
            include: {
              ticketType: true,
            },
          },
          tickets: true,
        },
      }),
      prisma.order.count({ where }),
    ])

    return { orders, total }
  }
}
