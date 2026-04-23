import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  
  // Add security headers
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  const { pathname } = new URL(request.url)
  
  // Admin-only routes
  const adminRoutes = ['/admin', '/AdminPacks']
  
  // Organizer routes (require organizer role or admin)
  const organizerRoutes = ['/CrearEvento', '/DashboardVentas', '/GestionStaff']
  
  // User routes (require authentication)
  const userRoutes = [
    '/MisCuentas',
    '/MisConsumiciones', 
    '/MisEntradas',
    '/Checkout',
    '/SalaEspera',
  ]

  // Check admin routes
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Note: Role checking is done at the API level for more granular control
  }
  
  // Check organizer routes
  if (organizerRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Note: Role checking is done at the API level
  }
  
  // Check user routes
  if (userRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
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
