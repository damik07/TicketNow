# Plan de Integración Completa - TicketNow Next.js

## 📋 Análisis Actual

### Componentes Adaptados
✅ **Pages Completas:**
- Home
- SerOrganizador 
- AdminPacks
- Checkout
- Contacto
- CrearEvento
- DashboardVentas
- EventDetail
- FAQ
- GestionStaff
- MisConsumiciones
- MisCuentas
- MisEntradas
- Nosotros
- SalaEspera (con YouTube)

### Schema Prisma Completo
✅ **Modelos de Datos Definidos:**
- User (autenticación, perfiles)
- Organizer (productores de eventos)
- Event (eventos)
- EventPack (packs de servicios)
- TicketType (tipos de entradas)
- Order (órdenes de compra)
- OrderItem (ítems de órdenes)
- Ticket (entradas digitales)
- BankAccount (cuentas bancarias)
- ConsumptionTransaction (transacciones de consumiciones)
- QueueEntry (fila virtual)
- ContactMessage (mensajes de contacto)

## 🎯 Plan de Integración de APIs

### 1. Sistema de Autenticación Next.js
**Priority: Alta**
- Implementar NextAuth.js con múltiples proveedores:
  - Google OAuth (para login con Google)
  - Email/Password tradicional
  - Magic links para recuperación de cuenta
- Middleware de autenticación para rutas protegidas
- Session management con JWT tokens
- Protección CSRF y rate limiting

### 2. API Routes para CRUD Operations
**Priority: Alta**
- Crear estructura de API routes en `/src/app/api/`:
  - `/api/auth/` - login, register, logout, me
  - `/api/events/` - CRUD de eventos
  - `/api/tickets/` - gestión de entradas
  - `/api/orders/` - procesamiento de compras
  - `/api/organizers/` - gestión de productores
  - `/api/bank-accounts/` - cuentas bancarias
  - `/api/queue/` - sistema de fila virtual
  - `/api/consumptions/` - gestión de consumiciones
  - `/api/admin/` - administración general

### 3. Integración con Base de Datos Prisma
**Priority: Alta**
- Configurar Prisma Client
- Implementar Server Actions para mutations
- Optimizar queries con Prisma Client
- Manejo de errores y validaciones
- Database transactions para integridad

### 4. Integraciones Externas
**Priority: Media**
- **Mercado Pago:** API para procesamiento de pagos
- **Email Service:** SendGrid o Resend para notificaciones
- **File Storage:** AWS S3 o Cloudinary para banners
- **QR Generation:** Biblioteca para códigos QR únicos
- **Google OAuth:** Configuración de autenticación

## 🚀 Implementación Detallada

### Fase 1: Autenticación (1-2 días)
```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { email, password, provider } = await request.json()
    
    if (provider === 'google') {
      // Google OAuth flow
    } else {
      // Email/password flow
      const user = await prisma.user.findUnique({
        where: { email }
      })
      
      if (user && await bcrypt.compare(password, user.passwordHash!)) {
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!)
        
        return NextResponse.json({
          user: { id: user.id, email: user.email, name: user.fullName },
          token
        })
      }
    }
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
```

### Fase 2: API Routes (3-5 días)
```typescript
// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url!)
  const events = await prisma.event.findMany({
    where: { status: 'publicado' },
    include: { organizer: true, ticketTypes: true }
  })
  
  return NextResponse.json(events)
}

export async function POST(request: NextRequest) {
  const { title, description, organizerId, ticketTypes } = await request.json()
  
  const event = await prisma.event.create({
    data: {
      title,
      description,
      organizerId,
      status: 'borrador',
      minPrice: Math.min(...ticketTypes.map(t => t.price)),
      totalCapacity: ticketTypes.reduce((sum, t) => sum + t.stockTotal, 0)
    },
    include: { ticketTypes: true }
  })
  
  return NextResponse.json(event)
}
```

### Fase 3: Componentes del Cliente (2-3 días)
```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user)
        setLoading(false)
      })
      .catch(() => {
        router.push('/login')
      })
  }, [])
  
  return { user, loading, login: (credentials) => { /* login logic */ } }
}
```

### Fase 4: Testing y Despliegue (1-2 días)
- Configurar variables de entorno
- Testing de todos los endpoints
- Integración con Mercado Pago sandbox
- Deploy en Vercel con PostgreSQL

## 📊 Estructura de Archivos

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── events/
│   │   ├── tickets/
│   │   ├── orders/
│   │   └── ...
│   ├── (auth)/
│   └── ...
├── components/
│   ├── pages/ (componentes adaptados)
│   └── ...
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   └── utils.ts
└── prisma/
    └── schema.prisma
```

## 🔧 Configuraciones Necesarias

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://..."

# Auth
JWT_SECRET="your-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# External APIs
MERCADOPAGO_ACCESS_TOKEN="..."
SENDGRID_API_KEY="..."
AWS_S3_BUCKET="..."
```

### Dependencies
```json
{
  "dependencies": {
    "next-auth": "^4.21.1",
    "@prisma/client": "^5.6.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "mercadopago": "^1.3.0",
    "@sendgrid/mail": "^7.7.0"
  }
}
```

## ✅ Checklist de Finalización

- [ ] Implementar sistema de autenticación NextAuth.js
- [ ] Crear API routes para todos los modelos
- [ ] Integrar componentes con APIs reales
- [ ] Configurar Mercado Pago
- [ ] Implementar sistema de notificaciones
- [ ] Testing completo del flujo
- [ ] Deploy en producción
- [ ] Documentación de APIs

## 🎯 Próximos Pasos

1. **Implementar autenticación con NextAuth.js**
2. **Crear API routes principales**
3. **Conectar componentes con APIs reales**
4. **Testing y validación**
5. **Deploy y monitoreo**

---

*Este documento servirá como guía completa para la implementación de todas las integraciones necesarias para que TicketNow funcione completamente con Next.js y Prisma.*
