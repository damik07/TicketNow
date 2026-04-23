import { prisma } from '@/lib/db'
import { BankAccount } from '@prisma/client'

export interface CreateBankAccountInput {
  userId: string
  alias?: string | null
  cbu: string
  bankName: string
  accountHolder: string
  isDefault?: boolean
}

export interface UpdateBankAccountInput {
  alias?: string | null
  cbu?: string
  bankName?: string
  accountHolder?: string
  isDefault?: boolean
}

export class BankAccountCRUD {
  // Create bank account
  static async create(data: CreateBankAccountInput): Promise<BankAccount> {
    // If this is set as default, unset all other default accounts for this user
    if (data.isDefault) {
      await prisma.bankAccount.updateMany({
        where: { userId: data.userId },
        data: { isDefault: false },
      })
    }

    return await prisma.bankAccount.create({
      data,
      include: {
        user: true,
      },
    })
  }

  // Get bank account by ID
  static async getById(id: string): Promise<BankAccount | null> {
    return await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        user: true,
      },
    })
  }

  // Get bank accounts by user
  static async getByUser(
    userId: string,
    options?: {
      page?: number
      limit?: number
    }
  ): Promise<{ bankAccounts: BankAccount[]; total: number }> {
    const { page = 1, limit = 20 } = options || {}
    const skip = (page - 1) * limit

    const [bankAccounts, total] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          user: true,
        },
      }),
      prisma.bankAccount.count({ where: { userId } }),
    ])

    return { bankAccounts, total }
  }

  // Get default bank account for user
  static async getDefaultByUser(userId: string): Promise<BankAccount | null> {
    return await prisma.bankAccount.findFirst({
      where: {
        userId,
        isDefault: true,
      },
      include: {
        user: true,
      },
    })
  }

  // Get all bank accounts (admin)
  static async getAll(options?: {
    page?: number
    limit?: number
    userId?: string
    search?: string
  }): Promise<{ bankAccounts: BankAccount[]; total: number }> {
    const { page = 1, limit = 20, userId, search } = options || {}
    const skip = (page - 1) * limit

    const where = {
      ...(userId && { userId }),
      ...(search && {
        OR: [
          { alias: { contains: search, mode: 'insensitive' as const } },
          { bankName: { contains: search, mode: 'insensitive' as const } },
          { accountHolder: { contains: search, mode: 'insensitive' as const } },
          { cbu: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [bankAccounts, total] = await Promise.all([
      prisma.bankAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
        },
      }),
      prisma.bankAccount.count({ where }),
    ])

    return { bankAccounts, total }
  }

  // Update bank account
  static async update(id: string, data: UpdateBankAccountInput): Promise<BankAccount> {
    // If setting as default, unset all other default accounts for this user
    if (data.isDefault) {
      const account = await prisma.bankAccount.findUnique({ where: { id } })
      if (account) {
        await prisma.bankAccount.updateMany({
          where: {
            userId: account.userId,
            id: { not: id },
          },
          data: { isDefault: false },
        })
      }
    }

    return await prisma.bankAccount.update({
      where: { id },
      data,
      include: {
        user: true,
      },
    })
  }

  // Set as default
  static async setAsDefault(id: string): Promise<BankAccount> {
    const account = await prisma.bankAccount.findUnique({ where: { id } })
    if (!account) throw new Error('Bank account not found')

    // Unset all other default accounts for this user
    await prisma.bankAccount.updateMany({
      where: {
        userId: account.userId,
        id: { not: id },
      },
      data: { isDefault: false },
    })

    // Set this as default
    return await prisma.bankAccount.update({
      where: { id },
      data: { isDefault: true },
      include: {
        user: true,
      },
    })
  }

  // Delete bank account
  static async delete(id: string): Promise<BankAccount> {
    return await prisma.bankAccount.delete({
      where: { id },
      include: {
        user: true,
      },
    })
  }

  // Check if CBU exists for user
  static async cbuExistsForUser(userId: string, cbu: string): Promise<boolean> {
    const account = await prisma.bankAccount.findFirst({
      where: {
        userId,
        cbu,
      },
      select: { id: true },
    })
    return !!account
  }

  // Check if alias exists for user
  static async aliasExistsForUser(userId: string, alias: string): Promise<boolean> {
    const account = await prisma.bankAccount.findFirst({
      where: {
        userId,
        alias,
      },
      select: { id: true },
    })
    return !!account
  }

  // Get bank account statistics
  static async getStats(userId?: string): Promise<{
    total: number
    withAlias: number
    defaultSet: number
    byBank: Record<string, number>
  }> {
    const where = userId ? { userId } : {}

    const [total, withAlias, defaultSet, byBank] = await Promise.all([
      prisma.bankAccount.count({ where }),
      prisma.bankAccount.count({
        where: { ...where, alias: { not: null } },
      }),
      prisma.bankAccount.count({
        where: { ...where, isDefault: true },
      }),
      prisma.bankAccount.groupBy({
        by: ['bankName'],
        where,
        _count: true,
      }),
    ])

    const bankCounts = byBank.reduce((acc, item) => {
      acc[item.bankName] = item._count
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      withAlias,
      defaultSet,
      byBank: bankCounts,
    }
  }
}
