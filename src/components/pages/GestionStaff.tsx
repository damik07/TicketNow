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
import { Users, Plus, QrCode, Loader2, UserCheck, Search, Camera, DollarSign, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import QRScanner from "@/components/scanner/QRScanner";

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

interface Ticket {
  id: string;
  qrCode: string;
  ticketTypeName: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  usageStatus: string;
  consumptionBalance?: number;
  consumptionInitial?: number;
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
  const [scanMode, setScanMode] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [validating, setValidating] = useState(false);
  const [consumptionAmount, setConsumptionAmount] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !user) {
        router.push('/Login');
        return;
      }

      // Validar que sea staff, organizador o admin
      if (!['ORGANIZER', 'ADMIN'].includes(user.role)) {
        toast.error("No tienes permisos para acceder a esta sección. Debes ser organizador.");
        router.push('/SerOrganizador');
        return;
      }

      try {
        let staffData = [];
        
        if (user.role === 'ADMIN') {
          // Admin ve todo el staff
          const staffRes = await fetch('/api/organizer/staff');
          if (staffRes.ok) {
            const result = await staffRes.json();
            staffData = result.staffMembers || [];
          } else {
            console.error('Error fetching staff:', staffRes.status);
            toast.error('Error al cargar los equipos');
          }
        } else if (user.role === 'ORGANIZER') {
          // Organizador ve solo su staff
          const staffRes = await fetch('/api/organizer/staff');
          if (staffRes.ok) {
            const result = await staffRes.json();
            staffData = result.staffMembers || [];
          } else {
            console.error('Error fetching staff:', staffRes.status);
            toast.error('Error al cargar tu equipo');
          }
        }
        
        setUsers(staffData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar los datos');
        setUsers([]);
        setLoading(false);
      }
    };

    if (!isLoadingAuth) {
      loadData();
    }
  }, [isAuthenticated, user, isLoadingAuth, router]);

  const staffUsers = users.filter((u) => u.role === "USER" || u.role === "ORGANIZER" || u.role === "ADMIN" || u.role === "STAFF");

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

    // Solo organizadores pueden invitar staff
    if (user?.role !== 'ORGANIZER') {
      toast.error("Solo los organizadores pueden invitar miembros a su equipo");
      return;
    }

    setInviting(true);
    
    try {
      const response = await fetch('/api/organizer/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const handleScanQR = async (code?: string) => {
    const qrCode = code || qrInput.trim();
    if (!qrCode) return;
    
    setValidating(true);
    setShowCamera(false);

    try {
      // API call para buscar ticket por QR
      const response = await fetch(`/api/tickets/qr/${qrCode}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ticket not found');
      }

      const ticket: Ticket = await response.json();
      
      const isConsumption = ticket.ticketTypeName?.toLowerCase().includes("consumición") || 
                           ticket.ticketTypeName?.toLowerCase().includes("consumicion");

      if (isConsumption) {
        // Handle consumption ticket
        const amount = parseFloat(consumptionAmount);
        if (!amount || amount <= 0) {
          toast.error("Ingresá un monto válido para consumir");
          setValidating(false);
          return;
        }
        
        const currentBalance = ticket.consumptionBalance ?? (ticket.consumptionInitial || 0);
        
        if (currentBalance >= amount) {
          // API call para procesar consumo
          const consumeResponse = await fetch(`/api/tickets/${ticket.id}/consume`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount })
          });

          if (!consumeResponse.ok) {
            const error = await consumeResponse.json();
            throw new Error(error.error || 'Failed to process consumption');
          }

          const result = await consumeResponse.json();
          const newBalance = result.newBalance;
          
          toast.success(`✓ Consumo aplicado: $${amount.toLocaleString("es-AR")}. Saldo restante: $${newBalance.toLocaleString("es-AR")}`);
        } else {
          const deficit = amount - currentBalance;
          toast.error(`Saldo insuficiente. Falta: $${deficit.toFixed(2)}`);
        }
        setConsumptionAmount("");
      } else {
        // Handle regular entry ticket
        if (ticket.usageStatus === "ingresado") {
          toast.error("Esta entrada ya fue utilizada");
          setValidating(false);
          setQrInput("");
          return;
        }
        
        // API call para validar entrada
        const validateResponse = await fetch(`/api/tickets/${ticket.id}/validate`, {
          method: 'POST'
        });

        if (!validateResponse.ok) {
          const error = await validateResponse.json();
          throw new Error(error.error || 'Failed to validate ticket');
        }

        toast.success(`✓ Entrada validada: ${ticket.eventTitle} - ${ticket.ticketTypeName}`);
      }
      
      setValidating(false);
      setQrInput("");
    } catch (error) {
      setValidating(false);
      toast.error(error instanceof Error ? error.message : "Error al validar el código QR");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestión de Staff</h1>
            <p className="text-slate-500 mt-1">Administrá tu equipo y validá entradas</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setScanMode(!scanMode)}
              variant={scanMode ? "default" : "outline"}
              className={scanMode
                ? "bg-violet-600 hover:bg-violet-500 border-0 gap-2"
                : "border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
              }
            >
              <QrCode className="w-4 h-4" /> Validar QR
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 gap-2">
                  <Plus className="w-4 h-4" /> Invitar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Invitar miembro</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-slate-400 text-xs mb-1.5 block">Email</Label>
                    <Input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="staff@email.com"
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs mb-1.5 block">Rol</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="productor">Productor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleInvite} 
                    disabled={inviting || !newEmail}
                    className="w-full bg-violet-600 hover:bg-violet-500 border-0"
                  >
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar Invitación"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* QR Scanner */}
        {scanMode && (
          <div className="bg-slate-900/50 border border-violet-500/30 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-violet-400" /> Validar entrada
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <Input
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScanQR()}
                  placeholder="Ingresá o escaneá el código QR..."
                  className="bg-slate-800/50 border-slate-700 text-white flex-1"
                  autoFocus
                  disabled={validating}
                />
                <Button 
                  onClick={() => setShowCamera(true)} 
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
                >
                  <Camera className="w-4 h-4" /> Cámara
                </Button>
                <Button 
                  onClick={() => handleScanQR()} 
                  disabled={validating}
                  className="bg-violet-600 hover:bg-violet-500 border-0 gap-2"
                >
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Validar"}
                </Button>
              </div>
              
              {/* Consumption amount input */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-700/50">
                <Label className="text-slate-400 text-sm whitespace-nowrap">Monto consumición:</Label>
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="number"
                    value={consumptionAmount}
                    onChange={(e) => setConsumptionAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-800/50 border-slate-700 text-white pl-9"
                  />
                </div>
                <span className="text-xs text-slate-500">(Solo para tickets de consumición)</span>
              </div>
            </div>
          </div>
        )}

        {/* Camera Scanner Modal */}
        {showCamera && (
          <QRScanner 
            onScan={handleScanQR}
            onClose={() => setShowCamera(false)}
          />
        )}

        {/* Staff Table */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800/50">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" /> Equipo
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-500">Nombre</TableHead>
                  <TableHead className="text-slate-500">Email</TableHead>
                  <TableHead className="text-slate-500">Rol</TableHead>
                  {user?.role === 'ADMIN' && <TableHead className="text-slate-500">Organizador</TableHead>}
                  {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && <TableHead className="text-slate-500">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || isLoadingAuth ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === 'ADMIN' ? 5 : user?.role === 'ORGANIZER' ? 4 : 3} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : staffUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === 'ADMIN' ? 5 : user?.role === 'ORGANIZER' ? 4 : 3} className="text-center text-slate-500 py-8">
                      No hay miembros del equipo
                    </TableCell>
                  </TableRow>
                ) : (
                  staffUsers.map((u) => (
                    <TableRow key={u.id} className="border-slate-800/50 hover:bg-slate-800/20">
                      <TableCell className="text-white font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                            {u.full_name?.[0]?.toUpperCase() || "U"}
                          </div>
                          {u.full_name || "Sin nombre"}
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
                        <TableCell className="text-slate-400 text-sm">
                          {u.organizerName || 'N/A'}
                        </TableCell>
                      )}
                      {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveStaff(u)}
                            className="text-slate-400 hover:text-red-400 h-8 w-8"
                            disabled={u.role === 'ADMIN'} // No se puede eliminar admin
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      )}
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
