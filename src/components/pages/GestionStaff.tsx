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
import { Users, Plus, QrCode, Loader2, UserCheck, Search, Camera, DollarSign } from "lucide-react";
import { toast } from "sonner";
import QRScanner from "@/components/scanner/QRScanner";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Ticket {
  id: string;
  qr_code: string;
  ticket_type_name: string;
  user_id: string;
  event_id: string;
  event_title: string;
  usage_status: string;
  consumption_balance?: number;
  consumption_initial?: number;
}

export default function GestionStaff() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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
      const timer = setTimeout(() => {
        // Mock user data
        const mockUser: User = {
          id: "1",
          full_name: "Administrador Test",
          email: "admin@test.com",
          role: "admin"
        };
        setUser(mockUser);

        // Mock users data
        const mockUsers: User[] = [
          {
            id: "1",
            full_name: "Administrador Test",
            email: "admin@test.com",
            role: "admin"
          },
          {
            id: "2",
            full_name: "Juan Pérez",
            email: "juan@test.com",
            role: "productor"
          },
          {
            id: "3",
            full_name: "María García",
            email: "maria@test.com",
            role: "staff"
          },
          {
            id: "4",
            full_name: "Carlos López",
            email: "carlos@test.com",
            role: "staff"
          }
        ];

        setUsers(mockUsers);
        setLoading(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    };
    
    loadData();
  }, []);

  const staffUsers = users.filter((u) => u.role === "staff" || u.role === "productor" || u.role === "admin");

  const handleInvite = async () => {
    if (!newEmail.trim()) {
      toast.error("Por favor, ingresa un email válido");
      return;
    }

    setInviting(true);
    
    try {
      // TODO: Implement Next.js API call for user invitation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate invitation
      const newUser: User = {
        id: Date.now().toString(),
        full_name: newEmail.split("@")[0],
        email: newEmail,
        role: newRole === "admin" ? "admin" : "user"
      };
      
      setUsers(prev => [...prev, newUser]);
      setInviting(false);
      setDialogOpen(false);
      setNewEmail("");
      toast.success(`Invitación enviada a ${newEmail}`);
    } catch (error) {
      setInviting(false);
      toast.error("Error al enviar invitación");
    }
  };

  const handleScanQR = async (code?: string) => {
    const qrCode = code || qrInput.trim();
    if (!qrCode) return;
    
    setValidating(true);
    setShowCamera(false);

    try {
      // TODO: Implement Next.js API call for ticket validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate ticket lookup
      const mockTickets: Ticket[] = [
        {
          id: "1",
          qr_code: "QR-123456789",
          ticket_type_name: "General",
          user_id: "user1",
          event_id: "1",
          event_title: "Festival de Música 2024",
          usage_status: "no_usado"
        },
        {
          id: "2",
          qr_code: "QR-987654321",
          ticket_type_name: "Consumición VIP",
          user_id: "user2",
          event_id: "1",
          event_title: "Festival de Música 2024",
          usage_status: "no_usado",
          consumption_balance: 5000,
          consumption_initial: 5000
        }
      ];

      const ticket = mockTickets.find(t => t.qr_code === qrCode);
      
      if (!ticket) {
        toast.error("Código QR no encontrado");
        setValidating(false);
        setQrInput("");
        return;
      }
      
      const isConsumption = ticket.ticket_type_name?.toLowerCase().includes("consumición") || 
                           ticket.ticket_type_name?.toLowerCase().includes("consumicion");

      if (isConsumption) {
        // Handle consumption ticket
        const amount = parseFloat(consumptionAmount);
        if (!amount || amount <= 0) {
          toast.error("Ingresá un monto válido para consumir");
          setValidating(false);
          return;
        }
        
        const currentBalance = ticket.consumption_balance ?? (ticket.consumption_initial || 0);
        
        if (currentBalance >= amount) {
          const newBalance = currentBalance - amount;
          // Simulate balance update and transaction
          console.log("Consumption processed:", {
            ticketId: ticket.id,
            amount,
            currentBalance,
            newBalance
          });
          
          toast.success(`✓ Consumo aplicado: $${amount.toLocaleString("es-AR")}. Saldo restante: $${newBalance.toLocaleString("es-AR")}`);
        } else {
          const deficit = amount - currentBalance;
          toast.error(`Saldo insuficiente. Falta: $${deficit.toFixed(2)}`);
        }
        setConsumptionAmount("");
      } else {
        // Handle regular entry ticket
        if (ticket.usage_status === "ingresado") {
          toast.error("Esta entrada ya fue utilizada");
          setValidating(false);
          setQrInput("");
          return;
        }
        
        // Simulate ticket validation
        console.log("Ticket validated:", ticket);
        toast.success(`✓ Entrada validada: ${ticket.event_title} - ${ticket.ticket_type_name}`);
      }
      
      setValidating(false);
      setQrInput("");
    } catch (error) {
      setValidating(false);
      toast.error("Error al validar el código QR");
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : staffUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-500 py-8">
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
                          u.role === "admin" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                          u.role === "productor" ? "bg-violet-500/10 text-violet-400 border-violet-500/30" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }`}>
                          {u.role}
                        </Badge>
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
