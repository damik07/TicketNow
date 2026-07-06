// 📄 Ubicación: src/middleware.ts
import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { normalizeUserRole, isAdminRole, isOrganizerOrAdmin } from '@/lib/user-role'

export async function middleware(request: Request) {
  const nextRequest = request as NextRequest;
  const token = await getToken({
    req: nextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  const { pathname } = new URL(nextRequest.url)
  const role = normalizeUserRole(token?.role)

  // 1. Rutas de administración total
  const adminRoutes = ['/admin', '/AdminPacks']

  // 2. Rutas de creación y negocio (Solo Organizador y Admin, el Staff NO entra acá)
  const organizerRoutes = ['/CrearEvento', '/DashboardVentas', '/GestionStaff']

  // 3. Rutas operativas de campo (Donde el STAFF sí tiene permiso para laburar)
  // ⚠️ Cambiá '/Escaneo' y '/Cobrar' por los nombres exactos de tus carpetas/rutas de la cámara y cobros
  const staffRoutes = ['/Escaneo']

  // 4. Rutas comunes para cualquier cliente/usuario logueado (incluido el Staff)
  const userRoutes = [
    '/MisCuentas',
    '/MisConsumiciones',
    '/MisEntradas',
    '/Checkout',
    '/SalaEspera',
  ]

  // --- VALIDACIONES ---

  // Protección APIs Admin
  if (pathname.startsWith('/api/admin')) {
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!isAdminRole(role)) return NextResponse.json({ error: 'Prohibido' }, { status: 403 })
  }

  // Vistas Admin
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) return NextResponse.redirect(new URL('/Login', nextRequest.url))
    if (!isAdminRole(role)) return NextResponse.redirect(new URL('/', nextRequest.url))
  }

  // Vistas Organizador (Sigue estricto: Staff rebota acá)
  if (organizerRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) return NextResponse.redirect(new URL('/Login', nextRequest.url))
    if (!isOrganizerOrAdmin(role)) {
      return NextResponse.redirect(new URL('/SerOrganizador', nextRequest.url))
    }
  }

  // 🚀 NUEVO: Vistas Operativas de Control (Entra ADMIN, ORGANIZER y STAFF)
  if (staffRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) return NextResponse.redirect(new URL('/Login', nextRequest.url))
    
    // Si no es ni Staff, ni Organizador, ni Admin... afuera.
    if (role !== 'STAFF' && !isOrganizerOrAdmin(role)) {
      return NextResponse.redirect(new URL('/', nextRequest.url))
    }
  }

  // Vistas comunes de usuarios
  if (userRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) return NextResponse.redirect(new URL('/Login', nextRequest.url))
  }

  return response
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/events/:path*',
    '/api/tickets/:path*',
    '/api/orders/:path*',
    '/api/organizers/:path*',
    '/api/bank-accounts/:path*',
    '/api/queue/:path*',
    '/api/consumptions/:path*',
    '/api/admin/:path*',
    '/admin',
    '/AdminPacks',
    '/CrearEvento',
    '/DashboardVentas',
    '/GestionStaff',
    '/MisCuentas',
    '/MisConsumiciones',
    '/MisEntradas',
    '/Checkout',
    '/SalaEspera',
    // ⚠️ No te olvides de agregar tus rutas de la cámara/cobros acá en el matcher si no estaban:
    '/Escaneo/:path*',
    
  ],
}