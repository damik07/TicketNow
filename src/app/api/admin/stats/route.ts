// 📄 Ubicación: src/app/api/admin/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth'; // 🚀 Agregado
import { authOptions } from '@/lib/auth';     // 🚀 Agregado
import { prisma } from '@/lib/db';
import { normalizeUserRole } from '@/lib/user-role'; // 🚀 Agregado

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. 🚀 Control de sesión: Verificar que el usuario esté autenticado
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 🚀 Control de rol: Buscar al usuario en la BD y validar que sea ADMIN
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentUserRole = normalizeUserRole(user.role);
    if (currentUserRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

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