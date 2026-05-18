import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { normalizeUserRole, isAdminRole, isOrganizerOrAdmin } from '@/lib/user-role'

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  const { pathname } = new URL(request.url)
  const role = normalizeUserRole(token?.role)

  const adminRoutes = ['/admin', '/AdminPacks']
  const organizerRoutes = ['/CrearEvento', '/DashboardVentas', '/GestionStaff']
  const userRoutes = [
    '/MisCuentas',
    '/MisConsumiciones',
    '/MisEntradas',
    '/Checkout',
    '/SalaEspera',
  ]

  if (pathname.startsWith('/api/admin')) {
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!isAdminRole(role)) {
      return NextResponse.json({ error: 'Prohibido' }, { status: 403 })
    }
  }

  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/Login', request.url))
    }
    if (!isAdminRole(role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (organizerRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/Login', request.url))
    }
    if (!isOrganizerOrAdmin(role)) {
      return NextResponse.redirect(new URL('/SerOrganizador', request.url))
    }
  }

  if (userRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/Login', request.url))
    }
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
  ],
}
