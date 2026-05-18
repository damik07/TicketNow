# Flujos y Permisos de Usuario - TicketNow

## Autenticación (Google vía NextAuth)

- **Entrada de usuario:** ruta de la app **`/Login`** (`signIn('google')`).
- **OAuth y sesión:** NextAuth en **`/api/auth/*`** (callback de Google: `/api/auth/callback/google`).
- Cualquier flujo alternativo con librerías OAuth “a mano” **no** forma parte del login actual; el único proveedor configurado en `auth.ts` es **Google** con NextAuth.

## Roles de Usuario

### 1. USER (Usuario Común)
- **Permisos**: Comprar tickets, ver sus entradas, gestionar cuentas bancarias, ver consumiciones
- **Acceso a**: 
  - ✅ Home, Eventos, Nosotros, FAQ, Contacto
  - ✅ Mis Entradas, Mis Cuentas, Mis Consumiciones
  - ✅ Ser Organizador (para convertirse)
  - ❌ Crear Evento, Dashboard Ventas, Gestión Staff, Admin Packs, Panel Admin

### 2. ORGANIZER (Organizador)
- **Permisos**: Todo lo de USER + crear y gestionar eventos, staff, dashboard
- **Acceso a**:
  - ✅ Todo lo de USER
  - ✅ Crear Evento, Dashboard Ventas, Gestión Staff
  - ❌ Admin Packs, Panel Admin

### 3. ADMIN (Administrador)
- **Permisos**: Acceso completo a todo el sistema
- **Acceso a**: Todas las rutas y funcionalidades

## Correcciones Aplicadas

### Problema 1: Botón "Ser Organizador" no visible
- **Causa**: Solo se mostraba para usuarios no autenticados
- **Solución**: Ahora se muestra solo para usuarios autenticados con rol USER
- **Archivo**: `src/layoutWrapper.tsx` líneas 90-97 y 195-203

### Problema 2: Acceso no autorizado a CrearEvento
- **Causa**: Usaba datos mock sin validar rol real
- **Solución**: Implementada validación con hook useAuth y redirección automática
- **Archivo**: `src/components/pages/CrearEvento.tsx`

## Flujo de Autenticación

1. **Usuario no autenticado**: Solo puede ver páginas públicas
2. **Usuario común (USER)**: 
   - Ve botón "Ser Organizador" para convertirse
   - Al intentar acceder a rutas de organizador → redirección a SerOrganizador
3. **Usuario organizador (ORGANIZER)**:
   - Acceso completo a funciones de organización
   - Dashboard de ventas y gestión de eventos
4. **Administrador (ADMIN)**:
   - Acceso total incluyendo panel de administración

## Middleware de Protección

El middleware (`src/middleware.ts`) protege las rutas:
- **Rutas de admin**: `/admin`, `/AdminPacks`
- **Rutas de organizador**: `/CrearEvento`, `/DashboardVentas`, `/GestionStaff`
- **Rutas de usuario**: `/MisCuentas`, `/MisEntradas`, etc.

## Validaciones por Componente

### CrearEvento
- Verifica autenticación con `useAuth()`
- Valida rol USER → redirige a SerOrganizador
- Valida rol ORGANIZER/ADMIN → permite acceso
- Verifica existencia de cuenta de organizador activa

### LayoutWrapper (Navbar)
- Muestra opciones según rol del usuario
- Botón "Ser Organizador" solo para usuarios USER
- Dashboard solo para ORGANIZER/ADMIN
- Admin solo para rol ADMIN
