// Sistema de permisos y roles para TicketNow

export enum UserRole {
  USER = 'USER',
  ORGANIZER = 'ORGANIZER', 
  ADMIN = 'ADMIN'
}

export interface Permission {
  resource: string;
  action: string;
}

// Definición de permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    { resource: 'tickets', action: 'read' },
    { resource: 'tickets', action: 'create' }, // comprar tickets
    { resource: 'orders', action: 'read' },
    { resource: 'orders', action: 'create' }, // realizar compras
    { resource: 'bank-accounts', action: 'read' },
    { resource: 'bank-accounts', action: 'create' },
    { resource: 'bank-accounts', action: 'update' },
    { resource: 'bank-accounts', action: 'delete' },
    { resource: 'consumptions', action: 'read' },
    { resource: 'queue', action: 'read' },
    { resource: 'queue', action: 'create' },
    { resource: 'auth', action: 'read' }, // ver su propio perfil
  ],
  
  [UserRole.ORGANIZER]: [
    // Hereda todos los permisos de USER
    ...[
      { resource: 'tickets', action: 'read' },
      { resource: 'tickets', action: 'create' },
      { resource: 'orders', action: 'read' },
      { resource: 'orders', action: 'create' },
      { resource: 'bank-accounts', action: 'read' },
      { resource: 'bank-accounts', action: 'create' },
      { resource: 'bank-accounts', action: 'update' },
      { resource: 'bank-accounts', action: 'delete' },
      { resource: 'consumptions', action: 'read' },
      { resource: 'queue', action: 'read' },
      { resource: 'queue', action: 'create' },
      { resource: 'auth', action: 'read' },
    ],
    // Permisos específicos de organizador
    { resource: 'events', action: 'read' },
    { resource: 'events', action: 'create' },
    { resource: 'events', action: 'update' },
    { resource: 'events', action: 'delete' },
    { resource: 'ticket-types', action: 'read' },
    { resource: 'ticket-types', action: 'create' },
    { resource: 'ticket-types', action: 'update' },
    { resource: 'ticket-types', action: 'delete' },
    { resource: 'organizer', action: 'read' },
    { resource: 'organizer', action: 'update' },
    { resource: 'dashboard', action: 'read' }, // ver dashboard de ventas
    { resource: 'staff', action: 'read' },
    { resource: 'staff', action: 'create' },
    { resource: 'staff', action: 'update' },
    { resource: 'staff', action: 'delete' },
  ],
  
  [UserRole.ADMIN]: [
    // Todos los permisos (acceso completo)
    { resource: '*', action: '*' }, // wildcard para acceso total
  ]
};

// Función para verificar si un usuario tiene permiso
export function hasPermission(
  userRole: UserRole, 
  resource: string, 
  action: string
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  
  // Admin tiene acceso a todo
  if (userRole === UserRole.ADMIN) {
    return true;
  }
  
  // Verificar permiso específico
  return permissions.some(
    permission => 
      (permission.resource === resource || permission.resource === '*') &&
      (permission.action === action || permission.action === '*')
  );
}

// Función para verificar si un usuario puede acceder a una ruta
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const routePermissions: Record<string, UserRole[]> = {
    '/': [UserRole.USER, UserRole.ORGANIZER, UserRole.ADMIN],
    '/Home': [UserRole.USER, UserRole.ORGANIZER, UserRole.ADMIN],
    '/SerOrganizador': [UserRole.USER, UserRole.ORGANIZER, UserRole.ADMIN],
    '/MisEntradas': [UserRole.USER, UserRole.ORGANIZER, UserRole.ADMIN],
    '/MisCuentas': [UserRole.USER, UserRole.ORGANIZER, UserRole.ADMIN],
    '/MisConsumiciones': [UserRole.USER, UserRole.ORGANIZER, UserRole.ADMIN],
    '/CrearEvento': [UserRole.ORGANIZER, UserRole.ADMIN],
    '/DashboardVentas': [UserRole.ORGANIZER, UserRole.ADMIN],
    '/GestionStaff': [UserRole.ORGANIZER, UserRole.ADMIN],
    '/AdminPacks': [UserRole.ADMIN],
    '/admin': [UserRole.ADMIN],
  };
  
  const allowedRoles = routePermissions[route];
  return allowedRoles ? allowedRoles.includes(userRole) : false;
}

// Middleware helper para verificar permisos en APIs
export function requirePermission(resource: string, action: string) {
  return (userRole: UserRole) => {
    return hasPermission(userRole, resource, action);
  };
}

// Helper para obtener el display name del rol
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case UserRole.USER:
      return 'Usuario';
    case UserRole.ORGANIZER:
      return 'Organizador';
    case UserRole.ADMIN:
      return 'Administrador';
    default:
      return 'Desconocido';
  }
}
