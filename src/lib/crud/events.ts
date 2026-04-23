import { prisma } from '@/lib/db'
import { Event, EventPack } from '@prisma/client'

export interface CreateEventInput {
  organizerId: string
  title: string
  description?: string | null
  dateTime: Date
  endDateTime?: Date | null
  locationName: string
  locationAddress: string
  locationLat?: number | null
  locationLng?: number | null
  bannerUrl?: string | null
  category: string
  status?: string
  featured?: boolean
  minPrice?: number | null
  totalCapacity?: number | null
  packId?: string | null
}

export interface UpdateEventInput {
  title?: string
  description?: string | null
  dateTime?: Date
  endDateTime?: Date | null
  locationName?: string
  locationAddress?: string
  locationLat?: number | null
  locationLng?: number | null
  bannerUrl?: string | null
  category?: string
  status?: string
  featured?: boolean
  minPrice?: number | null
  totalCapacity?: number | null
  packId?: string | null
}

export class EventCRUD {
  // Create event
  static async create(data: CreateEventInput): Promise<Event> {
    return await prisma.event.create({
      data,
      include: {
        organizer: {
          include: {
            user: true,
          },
        },
        ticketTypes: true,
        pack: true,
      },
    })
  }

  // Get event by ID
  static async getById(id: string): Promise<Event | null> {
    return await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          include: {
            user: true,
          },
        },
        ticketTypes: {
          orderBy: { sortOrder: 'asc' },
        },
        pack: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })
  }

  // Get all events with pagination and filters
  static async getAll(options?: {
    page?: number
    limit?: number
    category?: string
    status?: string
    featured?: boolean
    organizerId?: string
    search?: string
  }): Promise<{ events: Event[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      category,
      status,
      featured,
      organizerId,
      search,
    } = options || {}
    const skip = (page - 1) * limit

    const where = {
      ...(category && { category }),
      ...(status && { status }),
      ...(featured !== undefined && { featured }),
      ...(organizerId && { organizerId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { locationName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateTime: 'asc' },
        include: {
          organizer: {
            include: {
              user: true,
            },
          },
          ticketTypes: {
            orderBy: { sortOrder: 'asc' },
          },
          pack: true,
        },
      }),
      prisma.event.count({ where }),
    ])

    return { events, total }
  }

  // Get upcoming events
  static async getUpcoming(options?: {
    page?: number
    limit?: number
    category?: string
  }): Promise<{ events: Event[]; total: number }> {
    const { page = 1, limit = 20, category } = options || {}
    const skip = (page - 1) * limit

    const where = {
      status: 'publicado',
      dateTime: { gte: new Date() },
      ...(category && { category }),
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateTime: 'asc' },
        include: {
          organizer: {
            include: {
              user: true,
            },
          },
          ticketTypes: {
            orderBy: { sortOrder: 'asc' },
          },
          pack: true,
        },
      }),
      prisma.event.count({ where }),
    ])

    return { events, total }
  }

  // Get events by organizer
  static async getByOrganizer(
    organizerId: string,
    options?: {
      page?: number
      limit?: number
      status?: string
    }
  ): Promise<{ events: Event[]; total: number }> {
    const { page = 1, limit = 20, status } = options || {}
    const skip = (page - 1) * limit

    const where = {
      organizerId,
      ...(status && { status }),
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizer: {
            include: {
              user: true,
            },
          },
          ticketTypes: true,
          pack: true,
        },
      }),
      prisma.event.count({ where }),
    ])

    return { events, total }
  }

  // Update event
  static async update(id: string, data: UpdateEventInput): Promise<Event> {
    return await prisma.event.update({
      where: { id },
      data,
      include: {
        organizer: {
          include: {
            user: true,
          },
        },
        ticketTypes: true,
        pack: true,
      },
    })
  }

  // Delete event
  static async delete(id: string): Promise<Event> {
    return await prisma.event.delete({
      where: { id },
    })
  }

  // Update event status
  static async updateStatus(id: string, status: string): Promise<Event> {
    return await prisma.event.update({
      where: { id },
      data: { status },
    })
  }

  // Toggle featured status
  static async toggleFeatured(id: string): Promise<Event> {
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) throw new Error('Event not found')
    
    return await prisma.event.update({
      where: { id },
      data: { featured: !event.featured },
    })
  }

  // Get featured events
  static async getFeatured(limit: number = 6): Promise<Event[]> {
    return await prisma.event.findMany({
      where: {
        status: 'publicado',
        featured: true,
        dateTime: { gte: new Date() },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: {
          include: {
            user: true,
          },
        },
        ticketTypes: {
          orderBy: { sortOrder: 'asc' },
        },
        pack: true,
      },
    })
  }

  // Get events by category
  static async getByCategory(
    category: string,
    options?: {
      page?: number
      limit?: number
    }
  ): Promise<{ events: Event[]; total: number }> {
    const { page = 1, limit = 20 } = options || {}
    const skip = (page - 1) * limit

    const where = {
      category,
      status: 'publicado',
      dateTime: { gte: new Date() },
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateTime: 'asc' },
        include: {
          organizer: {
            include: {
              user: true,
            },
          },
          ticketTypes: {
            orderBy: { sortOrder: 'asc' },
          },
          pack: true,
        },
      }),
      prisma.event.count({ where }),
    ])

    return { events, total }
  }
}
