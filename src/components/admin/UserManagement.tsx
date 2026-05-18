'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Search, Shield, UserCheck, UserX, Edit, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserRole, getRoleDisplayName } from '@/lib/permissions';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  active: boolean;
  createdAt: string;
  organizer?: {
    id: string;
    businessName: string;
    verified: boolean;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [editDialog, setEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>(UserRole.USER);
  const [newActive, setNewActive] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: UserRole.USER,
    active: true
  });

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter, pagination.page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(roleFilter && roleFilter !== 'all' && { role: roleFilter })
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setNewRole(user.role);
    setNewActive(user.active);
    setEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setUpdating(true);
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: editingUser.id,
          role: newRole,
          active: newActive
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      const updatedUser = await response.json();
      
      // Update local state
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      setEditDialog(false);
      toast.success('Usuario actualizado correctamente');
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar usuario');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email) {
      toast.error('El email es requerido');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const createdUser = await response.json();
      
      // Reset form and close dialog
      setNewUser({
        email: '',
        full_name: '',
        role: UserRole.USER,
        active: true
      });
      setCreateDialog(false);
      
      // Reload users to show the new user
      loadUsers();
      toast.success('Usuario creado correctamente');
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear usuario');
    } finally {
      setCreating(false);
    }
  };

  const openDeleteDialog = (user: User) => {
    setDeletingUser(user);
    setDeleteDialog(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/admin/users?userId=${deletingUser.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      // Remove user from local state
      setUsers(users.filter(u => u.id !== deletingUser.id));
      setDeleteDialog(false);
      setDeletingUser(null);
      toast.success('Usuario eliminado correctamente');
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar usuario');
    } finally {
      setDeleting(false);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'destructive';
      case UserRole.ORGANIZER:
        return 'default';
      case UserRole.USER:
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-slate-400">Administra usuarios y roles de la plataforma</p>
        </div>
        <Button
          onClick={() => setCreateDialog(true)}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar usuario</Label>
              <Input
                id="search"
                placeholder="Buscar por email o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="role">Rol</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value={UserRole.USER}>Usuario</SelectItem>
                  <SelectItem value={UserRole.ORGANIZER}>Organizador</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usuarios ({pagination.total})
          </CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados en la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Organizador</TableHead>
                    <TableHead>Registrado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">
                            {user.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-slate-400">
                            {user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'default' : 'secondary'}>
                          {user.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.organizer ? (
                          <div>
                            <div className="text-sm text-white">
                              {user.organizer.businessName}
                            </div>
                            <Badge variant={user.organizer.verified ? 'default' : 'secondary'}>
                              {user.organizer.verified ? 'Verificado' : 'No verificado'}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-400">
                          {new Date(user.createdAt).toLocaleDateString('es-AR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            className="text-violet-400 hover:text-violet-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Mostrando {users.length} de {pagination.total} usuarios
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-slate-400 py-2">
                      Página {pagination.page} de {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>Usuario</Label>
                <div className="mt-1 p-2 bg-slate-800 rounded text-white">
                  <div>{editingUser.full_name || 'Sin nombre'}</div>
                  <div className="text-sm text-slate-400">{editingUser.email}</div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="role">Rol</Label>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.USER}>Usuario</SelectItem>
                    <SelectItem value={UserRole.ORGANIZER}>Organizador</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="active">Estado</Label>
                <Select value={newActive.toString()} onValueChange={(value) => setNewActive(value === 'true')}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpdateUser}
                  disabled={updating}
                  className="flex-1"
                >
                  {updating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  Actualizar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="full_name">Nombre Completo</Label>
              <Input
                id="full_name"
                placeholder="Juan Pérez"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="role">Rol</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRole })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.USER}>Usuario</SelectItem>
                  <SelectItem value={UserRole.ORGANIZER}>Organizador</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="active">Estado</Label>
              <Select value={newUser.active.toString()} onValueChange={(value) => setNewUser({ ...newUser, active: value === 'true' })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateUser}
                disabled={creating}
                className="flex-1"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Crear Usuario
              </Button>
              <Button
                variant="outline"
                onClick={() => setCreateDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">Eliminar Usuario</DialogTitle>
          </DialogHeader>
          {deletingUser && (
            <div className="space-y-4">
              <div className="text-slate-300">
                ¿Estás seguro de que quieres eliminar al usuario <span className="font-semibold text-white">{deletingUser.full_name || deletingUser.email}</span>?
              </div>
              
              <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
                <div className="text-sm text-red-400">
                  <strong>Advertencia:</strong> Esta acción no se puede deshacer. El usuario y todos sus datos asociados serán eliminados permanentemente.
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  variant="destructive"
                  className="flex-1"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Eliminar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
