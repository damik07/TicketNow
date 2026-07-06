import { prisma } from '@/lib/db'
import { User, UserRole } from '@prisma/client'

export interface StaffUser {
  id: string
  email: string
  full_name: string | null
  role: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateStaffInput {
  email: string
  full_name: string
  role: UserRole
  password_hash?: string
}

export interface UpdateStaffInput {
  email?: string
  full_name?: string
  role?: UserRole
  active?: boolean
}

export class StaffCRUD {
  // Get all staff users (admin/staff management)
  static async getAll(options?: {
    page?: number
    limit?: number
    role?: string
    search?: string
  }): Promise<{ users: StaffUser[]; total: number }> {
    const { page = 1, limit = 20, role, search } = options || {}
    const skip = (page - 1) * limit

    const where = {
      active: true,
      ...(role && { role: role as UserRole }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { full_name: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ])

    return { users, total }
  }

  // Get staff by ID
  static async getById(id: string): Promise<StaffUser | null> {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  // Create staff user
  static async create(data: CreateStaffInput): Promise<StaffUser> {
    return await prisma.user.create({
      data: {
        ...data,
        provider: 'email',
        active: true,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  // Update staff user
  static async update(id: string, data: UpdateStaffInput): Promise<StaffUser> {
    return await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  // Delete staff user (soft delete)
  static async softDelete(id: string): Promise<StaffUser> {
    return await prisma.user.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  // Invite staff user (simplified - in real app would send email)
  static async invite(data: CreateStaffInput): Promise<StaffUser> {
    // In a real implementation, this would:
    // 1. Generate a temporary password or invite token
    // 2. Send email with registration link
    // 3. Set a temporary inactive status until user accepts
    
    return await prisma.user.create({
      data: {
        ...data,
        provider: 'email',
        active: true, // Could be false until email confirmation
        password_hash: data.password_hash || null,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  // Get staff statistics
  static async getStats(): Promise<{
    total: number
    byRole: Record<string, number>
    active: number
    inactive: number
  }> {
    const rolesToCount = ['ADMIN', 'ORGANIZER', 'STAFF'].map(r => r as UserRole)
    const [total, byRole, active, inactive] = await Promise.all([
      prisma.user.count({
        where: {
          role: { in: rolesToCount },
        },
      }),
      prisma.user.groupBy({
        by: ['role'],
        where: {
          role: { in: rolesToCount },
        },
        _count: true,
      }),
      prisma.user.count({
        where: {
          role: { in: rolesToCount },
          active: true,
        },
      }),
      prisma.user.count({
        where: {
          role: { in: rolesToCount },
          active: false,
        },
      }),
    ])

    const roleCounts = byRole.reduce((acc, item) => {
      acc[item.role] = item._count
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      byRole: roleCounts,
      active,
      inactive,
    }
  }

  // Check if user has staff privileges
  static async hasStaffPrivileges(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        active: true,
      },
    })
    
    if (!user || !user.active) return false
    
    return ['ADMIN', 'ORGANIZER', 'STAFF'].includes(user.role)
  }

  // Get staff by role
  static async getByRole(
    role: string,
    options?: {
      page?: number
      limit?: number
    }
  ): Promise<{ users: StaffUser[]; total: number }> {
    const { page = 1, limit = 20 } = options || {}
    const skip = (page - 1) * limit

    const where = {
      role: role as UserRole,
      active: true,
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ])

    return { users, total }
  }
}
