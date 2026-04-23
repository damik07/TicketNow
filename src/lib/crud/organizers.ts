import { prisma } from '@/lib/db'
import { Organizer } from '@prisma/client'

export interface CreateOrganizerInput {
  userId: string
  businessName: string
  fiscalId?: string | null
  bankAccount?: string | null
  phone?: string | null
  logoUrl?: string | null
  verified?: boolean
}

export interface UpdateOrganizerInput {
  businessName?: string
  fiscalId?: string | null
  bankAccount?: string | null
  phone?: string | null
  logoUrl?: string | null
  verified?: boolean
}

export class OrganizerCRUD {
  // Create organizer
  static async create(data: CreateOrganizerInput): Promise<Organizer> {
    return await prisma.organizer.create({
      data,
      include: {
        user: true,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })
  }

  // Get organizer by ID
  static async getById(id: string): Promise<Organizer | null> {
    return await prisma.organizer.findUnique({
      where: { id },
      include: {
        user: true,
        events: {
          orderBy: { createdAt: 'desc' },
          include: {
            ticketTypes: true,
          },
        },
      },
    })
  }

  // Get organizer by user ID
  static async getByUserId(userId: string): Promise<Organizer | null> {
    return await prisma.organizer.findUnique({
      where: { userId },
      include: {
        user: true,
        events: {
          orderBy: { createdAt: 'desc' },
          include: {
            ticketTypes: true,
          },
        },
      },
    })
  }

  // Get all organizers (admin)
  static async getAll(options?: {
    page?: number
    limit?: number
    verified?: boolean
    search?: string
  }): Promise<{ organizers: Organizer[]; total: number }> {
    const { page = 1, limit = 20, verified, search } = options || {}
    const skip = (page - 1) * limit

    const where = {
      ...(verified !== undefined && { verified }),
      ...(search && {
        OR: [
          { businessName: { contains: search, mode: 'insensitive' as const } },
          { user: { email: { contains: search, mode: 'insensitive' as const } } },
          { user: { full_name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    }

    const [organizers, total] = await Promise.all([
      prisma.organizer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          events: {
            select: {
              id: true,
              title: true,
              status: true,
              dateTime: true,
            },
          },
        },
      }),
      prisma.organizer.count({ where }),
    ])

    return { organizers, total }
  }

  // Update organizer
  static async update(id: string, data: UpdateOrganizerInput): Promise<Organizer> {
    return await prisma.organizer.update({
      where: { id },
      data,
      include: {
        user: true,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })
  }

  // Update by user ID
  static async updateByUserId(
    userId: string,
    data: UpdateOrganizerInput
  ): Promise<Organizer> {
    return await prisma.organizer.update({
      where: { userId },
      data,
      include: {
        user: true,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })
  }

  // Delete organizer
  static async delete(id: string): Promise<Organizer> {
    return await prisma.organizer.delete({
      where: { id },
    })
  }

  // Verify organizer
  static async verify(id: string): Promise<Organizer> {
    return await prisma.organizer.update({
      where: { id },
      data: { verified: true },
      include: {
        user: true,
      },
    })
  }

  // Unverify organizer
  static async unverify(id: string): Promise<Organizer> {
    return await prisma.organizer.update({
      where: { id },
      data: { verified: false },
      include: {
        user: true,
      },
    })
  }

  // Check if user is organizer
  static async isUserOrganizer(userId: string): Promise<boolean> {
    const organizer = await prisma.organizer.findUnique({
      where: { userId },
      select: { id: true },
    })
    return !!organizer
  }

  // Get organizer statistics
  static async getStats(organizerId: string): Promise<{
    totalEvents: number
    publishedEvents: number
    totalTickets: number
    totalRevenue: number
    upcomingEvents: number
  }> {
    const [
      totalEvents,
      publishedEvents,
      totalTickets,
      totalRevenue,
      upcomingEvents,
    ] = await Promise.all([
      prisma.event.count({
        where: { organizerId },
      }),
      prisma.event.count({
        where: { organizerId, status: 'publicado' },
      }),
      prisma.ticket.count({
        where: {
          event: { organizerId },
        },
      }),
      prisma.order.aggregate({
        where: {
          event: { organizerId },
          paymentStatus: 'aprobado',
        },
        _sum: { totalAmount: true },
      }),
      prisma.event.count({
        where: {
          organizerId,
          status: 'publicado',
          dateTime: { gte: new Date() },
        },
      }),
    ])

    return {
      totalEvents,
      publishedEvents,
      totalTickets,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      upcomingEvents,
    }
  }
}
