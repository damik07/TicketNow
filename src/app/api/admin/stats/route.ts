import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get total users count
    const totalUsers = await prisma.user.count({
      where: {
        active: true
      }
    });

    // Get active packs count
    const activePacks = await prisma.eventPack.count({
      where: {
        isActive: true
      }
    });

    // Get staff members count (with error handling for missing table)
    let staffMembers = 0;
    try {
      staffMembers = await prisma.staffMember.count({
        where: {
          active: true
        }
      });
    } catch (staffError) {
      console.warn('StaffMember table not found or query failed:', staffError);
      // Keep staffMembers as 0 if table doesn't exist
    }

    // Get active events count (published events)
    const activeEvents = await prisma.event.count({
      where: {
        status: 'publicado'
      }
    });

    const stats = {
      totalUsers,
      activePacks,
      staffMembers,
      activeEvents
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
