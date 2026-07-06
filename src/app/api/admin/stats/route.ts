// 📄 Ubicación: src/app/api/admin/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth'; // 🚀 Agregado
import { authOptions } from '@/lib/auth';     // 🚀 Agregado
import { prisma } from '@/lib/db';
import { normalizeUserRole } from '@/lib/user-role'; // 🚀 Agregado

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    

    // -----------------------------------------------------------------
    // Si pasa los controles de arriba, recién ahí ejecuta las consultas
    // -----------------------------------------------------------------

    // Get total users count
    const totalUsers = await prisma.user.count({
      where: { active: true }
    });

    // Get active packs count
    const activePacks = await prisma.eventPack.count({
      where: { isActive: true }
    });

    // Get staff members count
    let staffMembers = 0;
    try {
      staffMembers = await prisma.staffMember.count({
        where: { active: true }
      });
    } catch (staffError) {
      console.warn('StaffMember table not found or query failed:', staffError);
    }

    // Get active events count
    const activeEvents = await prisma.event.count({
      where: { status: 'publicado' }
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