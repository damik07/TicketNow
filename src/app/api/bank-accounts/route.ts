import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const userId = searchParams.get('userId')

    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        ...(userId && { userId }),
      },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" }
      ]
    })

    return NextResponse.json(bankAccounts)
  } catch (error) {
    console.error('Bank accounts GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch bank accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cbu, alias, bankName, accountHolder, isDefault } = await request.json()

    // Get user by email first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If setting as default, unset others first
    if (isDefault) {
      await prisma.bankAccount.updateMany({
        where: { userId: user.id },
        data: { isDefault: false }
      })
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId: session.user.id,
        cbu,
        alias,
        bankName,
        accountHolder,
        isDefault,
      }
    })

    return NextResponse.json(bankAccount)
  } catch (error) {
    console.error('Bank account creation error:', error)
    return NextResponse.json({ error: 'Failed to create bank account' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const accountId = searchParams.get('id')
    const session = await getServerSession(authOptions, request)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    // Verify ownership
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: accountId }
    })

    if (!bankAccount || bankAccount.userId !== session.user.id) {
      return NextResponse.json({ error: 'Bank account not found or unauthorized' }, { status: 404 })
    }

    await prisma.bankAccount.delete({
      where: { id: accountId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bank account deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete bank account' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url!)
    const accountId = searchParams.get('id')
    const session = await getServerSession(authOptions, request)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    // Verify ownership
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: accountId }
    })

    if (!bankAccount || bankAccount.userId !== session.user.id) {
      return NextResponse.json({ error: 'Bank account not found or unauthorized' }, { status: 404 })
    }

    const { isDefault } = await request.json()

    const updatedAccount = await prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        isDefault,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedAccount)
  } catch (error) {
    console.error('Bank account update error:', error)
    return NextResponse.json({ error: 'Failed to update bank account' }, { status: 500 })
  }
}
