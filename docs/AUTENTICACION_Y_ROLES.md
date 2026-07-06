# 📋 Guía de Autenticación y Roles - TicketNow

## 🔐 **Sistema de Autenticación**

### 🎯 **Método de Autenticación**
- **Google OAuth Only** - Los usuarios se autentican con su cuenta de Google
- **No hay login con email/contraseña** - Más seguro y sin gestión de contraseñas
- **NextAuth.js** - Manejo seguro de sesiones y tokens JWT
- **Hook useAuth** - Hook personalizado para acceder a la sesión de NextAuth

### ℹ️ **Un solo flujo de Google (NextAuth)**

El login con Google que debe mantenerse es **exclusivamente el de NextAuth**:

- **UI:** `src/app/Login/page.tsx` — botón que llama a `signIn('google', …)` de `next-auth/react`.
- **API:** `src/app/api/auth/[...nextauth]/route.ts` — manejador de NextAuth.
- **Config:** `src/lib/auth.ts` — `GoogleProvider` + callbacks JWT/sesión (sincronización con Prisma y rol en el token).

En el repositorio puede haber existido u otro intento de OAuth con `google-auth-library` o componentes tipo “callback manual”. Eso **no** era el login de producción: no pasaba por NextAuth ni por las cookies de sesión de la app. Ese código duplicado se retiró para evitar confusiones; **no reempluye** a NextAuth ni al botón “Continuar con Google” de `/Login`.

### 🚀 **Flujo de Login**
1. **Usuario hace clic en "Ingresar"** → Redirige a `/Login`
2. **Hace clic en "Continuar con Google"** → Redirige a Google OAuth
3. **Google autentica** → Redirige de vuelta a la aplicación (`/api/auth/callback/google`)
4. **NextAuth callback JWT** → Sincroniza usuario con base de datos y asigna rol
5. **NextAuth callback session** → Propaga rol al cliente
6. **Usuario queda logueado** → Hook useAuth detecta la sesión
7. **Navbar se actualiza** → Muestra opciones según rol del usuario

## 👥 **Sistema de Roles**

### 📋 **Roles Disponibles**

#### 🔵 **USER (Usuario Normal)**
- **Permisos:** Comprar entradas, ver sus tickets, gestionar su perfil
- **Acceso:** Home, Mis Entradas, Mis Cuentas, Mis Consumiciones
- **Por defecto:** Todos los nuevos usuarios son USER

#### 🟢 **ORGANIZER (Organizador)**
- **Permisos:** Todo de USER + Crear eventos, gestionar eventos, ver dashboard
- **Acceso:** Todo de USER + Crear Evento, Dashboard Ventas, Gestion Staff
- **Asignación:** Un administrador debe asignar este rol manualmente

#### 🔴 **ADMIN (Administrador)**
- **Permisos:** Acceso completo a toda la plataforma
- **Acceso:** Todas las rutas + `/admin` (panel de administración)
- **Asignación:** Manual en base de datos o por otro admin

## 🛠️ **Gestión de Roles**

### 👤 **Para Administradores**

#### 🎯 **Acceso al Panel de Admin**
1. **Login con Google** usando `admin@ticketnow.com`
2. **Acceso automático** a `/admin` desde el menú de navegación
3. **Gestión completa** de usuarios y roles

#### 📋 **Funcionalidades del Panel Admin**
- ✅ **Ver todos los usuarios** con paginación
- ✅ **Buscar usuarios** por email o nombre
- ✅ **Filtrar por rol** (USER/ORGANIZER/ADMIN)
- ✅ **Cambiar roles** de usuarios
- ✅ **Activar/Desactivar** usuarios
- ✅ **Ver información** del organizador asociado

#### 🔒 **Restricciones de Seguridad**
- ✅ **Solo admins** pueden acceder a `/admin`
- ✅ **No se puede modificar** el propio rol
- ✅ **Validación en API** para cada acción
- ✅ **Protección de rutas** en middleware

### 🔄 **Para Organizadores**

#### 📋 **Cómo Convertirse en Organizador**
1. **Registro normal** como USER
2. **Contactar a un admin** para solicitar el rol
3. **Admin asigna rol ORGANIZER** desde el panel
4. **Acceso inmediato** a funcionalidades de organizador

#### 🎯 **Funcionalidades del Organizador**
- ✅ **Crear y gestionar eventos**
- ✅ **Ver dashboard de ventas**
- ✅ **Gestionar staff y validación**
- ✅ **Ver estadísticas de sus eventos**

## 🔧 **Configuración Técnica**

### 📁 **Archivos Clave**
```
src/
├── lib/
│   ├── auth.ts              # NextAuth: GoogleProvider + JWT/sesión
│   ├── user-role.ts         # Normalización de roles (UI + middleware)
│   └── middleware.ts        # Sistema de permisos
├── app/
│   ├── Login/page.tsx       # Página de login (Google vía NextAuth)
│   ├── api/auth/[...nextauth]/route.ts  # NextAuth (OAuth Google)
│   ├── api/admin/users/     # API de gestión de usuarios
│   └── admin/page.tsx       # Panel de administración
├── components/
│   └── admin/
│       └── UserManagement.tsx # Componente de gestión
├── middleware.ts            # Protección de rutas
└── hooks/
    └── useAuth.tsx         # Hook de autenticación
```

### 🗄️ **Base de Datos**
```sql
-- Modelo User con enum de roles
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "full_name" TEXT,
  "role" "UserRole" DEFAULT 'USER',
  "provider" TEXT DEFAULT 'email',
  "active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Enum de roles
CREATE TYPE "UserRole" AS ENUM ('USER', 'ORGANIZER', 'ADMIN');
```

## 🚀 **Flujos de Usuario**

### 🎫 **Usuario Normal (Comprador)**
```
Registro/Login → Home → Ver Eventos → Comprar Entrada → Mis Entradas → Checkout
```

### 🎪 **Organizador (Creador de Eventos)**
```
Login → Dashboard → Crear Evento → Gestionar Evento → Ver Ventas → Gestionar Staff
```

### 🔧 **Administrador (Gestor de Plataforma)**
```
Login → Panel Admin → Gestionar Usuarios → Asignar Roles → Ver Estadísticas
```

## 🔒 **Seguridad**

### 🛡️ **Medidas de Seguridad**
- ✅ **Google OAuth** - Autenticación segura sin contraseñas
- ✅ **NextAuth** - Manejo seguro de sesiones y tokens
- ✅ **Role-based Access Control** - Permisos granulares
- ✅ **Middleware protection** - Protección de rutas
- ✅ **API validation** - Validación en cada endpoint
- ✅ **HTTPS only** - Solo conexiones seguras

### 🔐 **Permisos por Recurso**
```
/api/events        - USER:read, ORGANIZER:create/update/delete
/api/tickets       - USER:create, ORGANIZER:read
/api/orders        - USER:create/read, ORGANIZER:read
/api/admin/users   - ADMIN:all
```

## 📞 **Soporte y Troubleshooting**

### 🔧 **Problemas Comunes**

#### ❌ **"Error 404 en /login" (minúsculas)**
- **Solución:** La pantalla de acceso de la app es **`/Login`** (carpeta `app/Login` en el proyecto).
- **Motivo:** Next.js distingue mayúsculas en la ruta; las URLs de NextAuth siguen siendo `/api/auth/...` (por ejemplo `/api/auth/callback/google`).

#### ❌ **"No puedo acceder a /admin"**
- **Solución:** Verificar que el rol sea ADMIN en la base de datos
- **Motivo:** Protección por rol en middleware y API

#### ❌ **"Google OAuth no funciona"**
- **Solución:** Configurar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`
- **Motivo:** Falta configuración de OAuth

### 📞 **Contacto de Soporte**
- **Admin principal:** admin@ticketnow.com
- **Documentación:** docs/ folder
- **Issues:** GitHub repository

## 🎯 **Próximos Pasos**

1. **Configurar Google OAuth** en variables de entorno
2. **Crear cuenta Google** para admin@ticketnow.com
3. **Probar flujo completo** de login y gestión
4. **Documentar procesos** internos de gestión
5. **Capacitar administradores** en el uso del panel

---

*Última actualización: Abril 2026*
