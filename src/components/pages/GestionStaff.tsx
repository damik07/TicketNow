"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  active: boolean;
  organizerName?: string;
  organizerEmail?: string;
  staffMemberId?: string;
}

export default function GestionStaff() {
  const router = useRouter();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !user) {
        router.push('/Login');
        return;
      }

      // Estricto: STAFF rebotará desde acá si intenta saltearse el middleware
      if (!['ORGANIZER', 'ADMIN'].includes(user.role)) {
        toast.error("No tienes permisos para acceder a esta sección. Debes ser organizador.");
        router.push('/');
        return;
      }

      try {
        const staffRes = await fetch('/api/organizer/staff');
        if (staffRes.ok) {
          const result = await staffRes.json();
          setUsers(result.staffMembers || []);
        } else {
          toast.error('Error al cargar tu equipo');
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar los datos');
        setLoading(false);
      }
    };

    if (!isLoadingAuth) {
      loadData();
    }
  }, [isAuthenticated, user, isLoadingAuth, router]);

  const handleRemoveStaff = async (staffMember: any) => {
    if (!confirm(`¿Estás seguro que quieres eliminar a ${staffMember.email} del equipo?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/organizer/staff/${staffMember.staffMemberId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove staff member');
      }

      setUsers(prev => prev.filter(u => u.id !== staffMember.id));
      toast.success(`Miembro eliminado del equipo`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar miembro del equipo");
    }
  };

  const handleInvite = async () => {
    if (!newEmail.trim()) {
      toast.error("Por favor, ingresa un email válido");
      return;
    }

    if (user?.role !== 'ORGANIZER') {
      toast.error("Solo los organizadores pueden invitar miembros a su equipo");
      return;
    }

    setInviting(true);
    try {
      const response = await fetch('/api/organizer/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          role: newRole.toUpperCase(),
          permissions: {}
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to invite staff member');
      }

      const newStaffMember = await response.json();
      setUsers(prev => [...prev, newStaffMember]);
      setInviting(false);
      setDialogOpen(false);
      setNewEmail("");
      toast.success(`Miembro agregado al equipo: ${newEmail}`);
    } catch (error) {
      setInviting(false);
      toast.error(error instanceof Error ? error.message : "Error al agregar miembro al equipo");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestión de Equipo</h1>
            <p className="text-slate-500 mt-1">Administrá el staff asignado a tus eventos</p>
          </div>
          <div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 gap-2">
                  <Plus className="w-4 h-4" /> Invitar Miembro
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Invitar al Equipo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-slate-400 text-xs mb-1.5 block">Email del Usuario</Label>
                    <Input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="nombre@email.com"
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs mb-1.5 block">Rol Operativo</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="staff">Staff (Control de Acceso/Caja)</SelectItem>
                        <SelectItem value="organizer">Organizador Co-Asociado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleInvite} 
                    disabled={inviting || !newEmail}
                    className="w-full bg-violet-600 hover:bg-violet-500 border-0"
                  >
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar e Invitar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800/50">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" /> Miembros Activos
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-500">Nombre</TableHead>
                  <TableHead className="text-slate-500">Email</TableHead>
                  <TableHead className="text-slate-500">Rol</TableHead>
                  {user?.role === 'ADMIN' && <TableHead className="text-slate-500">Organizador Principal</TableHead>}
                  <TableHead className="text-slate-500 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || isLoadingAuth ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                      No tenés miembros asignados a tu equipo en este momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} className="border-slate-800/50 hover:bg-slate-800/20">
                      <TableCell className="text-white font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                            {u.full_name?.[0]?.toUpperCase() || "U"}
                          </div>
                          {u.full_name || "Usuario Registrado"}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge className={`border text-xs ${
                          u.role === "ADMIN" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                          u.role === "ORGANIZER" ? "bg-violet-500/10 text-violet-400 border-violet-500/30" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }`}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      {user?.role === 'ADMIN' && (
                        <TableCell className="text-slate-400 text-sm">{u.organizerName || 'N/A'}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStaff(u)}
                          className="text-slate-400 hover:text-red-400 h-8 w-8"
                          disabled={u.role === 'ADMIN' || u.id === user?.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}