import { prisma } from '@/lib/db'
import { User, UserRole } from '@prisma/client'

export interface CreateUserInput {
  email: string
  full_name?: string | null
  avatar_url?: string | null
  role?: UserRole
  provider?: string
  provider_id?: string | null
  password_hash?: string | null
}

export interface UpdateUserInput {
  email?: string
  full_name?: string | null
  avatar_url?: string | null
  role?: UserRole
  provider?: string
  provider_id?: string | null
  password_hash?: string | null
  active?: boolean
}

export class UserCRUD {
  // Create user
  static async create(data: CreateUserInput): Promise<User> {
    return await prisma.user.create({
      data,
    })
  }

  // Get user by ID
  static async getById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        bankAccounts: true,
        organizer: true,
        orders: true,
        tickets: true,
      },
    })
  }

  // Get user by email
  static async getByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        bankAccounts: true,
        organizer: true,
        orders: true,
        tickets: true,
      },
    })
  }

  // Get user by provider ID (for OAuth)
  static async getByProviderId(provider: string, providerId: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        provider,
        provider_id: providerId,
      },
    })
  }

  // Get all users (admin)
  static async getAll(options?: {
    page?: number
    limit?: number
    role?: string
    search?: string
  }): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 20, role, search } = options || {}
    const skip = (page - 1) * limit

    const where = {
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
      }),
      prisma.user.count({ where }),
    ])

    return { users, total }
  }

  // Update user
  static async update(id: string, data: UpdateUserInput): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data,
    })
  }

  // Delete user (soft delete by setting active to false)
  static async softDelete(id: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { active: false },
    })
  }

  // Hard delete user (admin only)
  static async hardDelete(id: string): Promise<User> {
    return await prisma.user.delete({
      where: { id },
    })
  }

  // Check if email exists
  static async emailExists(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    return !!user
  }

  // Update last login (could add a lastLogin field to schema)
  static async updateLastLogin(id: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { updatedAt: new Date() },
    })
  }
}
