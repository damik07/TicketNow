// lib/user-role.ts

/** Roles de aplicación (alineados con Prisma `UserRole`). */
export type AppUserRole = 'USER' | 'ORGANIZER' | 'ADMIN' | 'STAFF'

/**
 * Normaliza el rol desde JWT/sesión/DB para comparaciones en UI y middleware.
 */
export function normalizeUserRole(role: unknown): AppUserRole {
  const r = String(role ?? 'USER').toUpperCase().trim()
  if (r === 'ADMIN' || r === 'ORGANIZER' || r === 'STAFF' || r === 'USER') return r
  return 'USER'
}

export function isAdminRole(role: AppUserRole): boolean {
  return role === 'ADMIN'
}

export function isOrganizerOrAdmin(role: AppUserRole): boolean {
  return role === 'ORGANIZER' || role === 'ADMIN'
}

/** Permite verificar si es un rol con permisos de gestión en general (Equipo/Staff) */
export function isManagementRole(role: AppUserRole): boolean {
  return role === 'STAFF' || role === 'ORGANIZER' || role === 'ADMIN'
}

/** * 🚀 NUEVO: Traído del archivo viejo y unificado con STAFF.
 * Helper para obtener el display name del rol en castellano para la UI.
 */
export function getRoleDisplayName(role: AppUserRole): string {
  switch (role) {
    case 'USER':
      return 'Usuario';
    case 'ORGANIZER':
      return 'Organizador';
    case 'ADMIN':
      return 'Administrador';
    case 'STAFF':
      return 'Staff Operativo';
    default:
      return 'Desconocido';
  }
}