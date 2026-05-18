/** Roles de aplicación (alineados con Prisma `UserRole`). */
export type AppUserRole = 'USER' | 'ORGANIZER' | 'ADMIN'

/**
 * Normaliza el rol desde JWT/sesión/DB para comparaciones en UI y middleware.
 */
export function normalizeUserRole(role: unknown): AppUserRole {
  const r = String(role ?? 'USER').toUpperCase().trim()
  if (r === 'ADMIN' || r === 'ORGANIZER' || r === 'USER') return r
  return 'USER'
}

export function isAdminRole(role: AppUserRole): boolean {
  return role === 'ADMIN'
}

export function isOrganizerOrAdmin(role: AppUserRole): boolean {
  return role === 'ORGANIZER' || role === 'ADMIN'
}
