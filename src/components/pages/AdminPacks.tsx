"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Package, Loader2, QrCode, Users, ShoppingBag, Ticket } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  role: string;
}

interface Pack {
  id: string;
  name: string;
  description?: string;
  has_physical_tickets: boolean;
  has_digital_tickets: boolean;
  has_qr_validation: boolean;
  has_consumptions: boolean;
  has_staff_management: boolean;
  commission_type: "porcentaje" | "fijo";
  commission_tickets: number;
  commission_consumptions: number;
  is_active: boolean;
}

interface Event {
  id: string;
  title: string;
  location_name: string;
  status: string;
  pack_id?: string;
}

const defaultPack: Omit<Pack, 'id'> = {
  name: "", description: "",
  has_physical_tickets: true, has_digital_tickets: false,
  has_qr_validation: false, has_consumptions: false, has_staff_management: false,
  commission_type: "porcentaje", commission_tickets: 0, commission_consumptions: 0,
  is_active: true,
};

const FEATURES = [
  { key: "has_physical_tickets", label: "Entradas físicas" },
  { key: "has_digital_tickets", label: "Entradas digitales" },
  { key: "has_qr_validation", label: "Validación QR" },
  { key: "has_consumptions", label: "Consumiciones con saldo" },
  { key: "has_staff_management", label: "Gestión de staff" },
];

export default function AdminPacks() {
  const [user, setUser] = useState<User | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [packDialog, setPackDialog] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [packForm, setPackForm] = useState<Omit<Pack, 'id'>>(defaultPack);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Get current session and check admin role
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.error) {
          router.push('/login');
          return;
        }

        if (data.user.role !== 'admin') {
          toast.error('No tienes permisos de administrador');
          router.push('/');
          return;
        }

        setUser(data.user);

        // Load packs and events
        const [packsResponse, eventsResponse] = await Promise.all([
          fetch('/api/packs'),
          fetch('/api/events')
        ]);

        const packsData = await packsResponse.json();
        const eventsData = await eventsResponse.json();

        setPacks(packsData || []);
        setEvents(eventsData || []);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load admin data:', error);
        setLoading(false);
      }
    };
    
    load();
  }, [router]);

  const openCreate = () => { 
    setEditingPack(null); 
    setPackForm(defaultPack); 
    setPackDialog(true); 
  };

  const openEdit = (pack: Pack) => { 
    setEditingPack(pack); 
    setPackForm({ ...pack }); 
    setPackDialog(true); 
  };

  const handleSavePack = async () => {
    if (!packForm.name.trim()) {
      toast.error("El nombre del pack es requerido");
      return;
    }
    
    setSaving(true);
    
    try {
      // TODO: Implement Next.js API call for pack creation/update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (editingPack) {
        setPacks(prev => prev.map(p => 
          p.id === editingPack.id 
            ? { ...packForm, id: editingPack.id }
            : p
        ));
        toast.success("Pack actualizado");
      } else {
        const newPack: Pack = {
          ...packForm,
          id: Date.now().toString(),
        };
        setPacks(prev => [...prev, newPack]);
        toast.success("Pack creado");
      }
      
      setSaving(false);
      setPackDialog(false);
    } catch (error) {
      setSaving(false);
      toast.error("Error al guardar el pack");
    }
  };

  const handleDeletePack = async (pack: Pack) => {
    try {
      // TODO: Implement Next.js API call for pack deletion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPacks(prev => prev.filter(p => p.id !== pack.id));
      toast.success("Pack eliminado");
    } catch (error) {
      toast.error("Error al eliminar el pack");
    }
  };

  const handleAssignPack = async (eventId: string, packId: string) => {
    try {
      // TODO: Implement Next.js API call for pack assignment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setEvents(prev => prev.map(ev => 
        ev.id === eventId 
          ? { ...ev, pack_id: packId === "none" ? undefined : packId }
          : ev
      ));
      toast.success("Pack asignado al evento");
    } catch (error) {
      toast.error("Error al asignar el pack");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-violet-400" />
            Administración de Packs
          </h1>
          <p className="text-slate-500 mt-2">Configurá packs de servicios y asignalos a eventos</p>
        </div>

        <Tabs defaultValue="packs">
          <TabsList className="bg-slate-900 border border-slate-800 mb-6">
            <TabsTrigger value="packs" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              Packs de servicios
            </TabsTrigger>
            <TabsTrigger value="eventos" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              Asignar a eventos
            </TabsTrigger>
          </TabsList>

          {/* ── PACKS TAB ── */}
          <TabsContent value="packs">
            <div className="flex justify-end mb-4">
              <Button onClick={openCreate} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 gap-2">
                <Plus className="w-4 h-4" /> Nuevo pack
              </Button>
            </div>

            {loadingPacks ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>
            ) : packs.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                No hay packs creados aún.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packs.map((pack) => (
                  <div key={pack.id} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-semibold">{pack.name}</h3>
                          <Badge className={`border text-xs ${pack.is_active ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/30"}`}>
                            {pack.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        {pack.description && <p className="text-slate-500 text-xs mt-1">{pack.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(pack)} className="text-slate-400 hover:text-white h-8 w-8">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePack(pack)} className="text-slate-400 hover:text-red-400 h-8 w-8">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {FEATURES.map(({ key, label }) =>
                        pack[key as keyof Pack] ? (
                          <span key={key} className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full px-2.5 py-0.5">
                            {label}
                          </span>
                        ) : null
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Comisión entradas: {pack.commission_type === "porcentaje" ? `${pack.commission_tickets}%` : `$${pack.commission_tickets}`}
                      {pack.has_consumptions && ` · Consumiciones: ${pack.commission_type === "porcentaje" ? `${pack.commission_consumptions}%` : `$${pack.commission_consumptions}`}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── EVENTOS TAB ── */}
          <TabsContent value="eventos">
            {loadingEvents ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-800/50">
                  <p className="text-sm text-slate-400">Asigná el pack contratado a cada evento. Las funcionalidades se habilitan automáticamente.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left text-xs text-slate-500 font-medium px-5 py-3">Evento</th>
                        <th className="text-left text-xs text-slate-500 font-medium px-5 py-3">Estado</th>
                        <th className="text-left text-xs text-slate-500 font-medium px-5 py-3 w-52">Pack asignado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.length === 0 ? (
                        <tr><td colSpan={3} className="text-center text-slate-500 py-8">No hay eventos</td></tr>
                      ) : events.map((ev) => (
                        <tr key={ev.id} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                          <td className="px-5 py-3">
                            <p className="text-white text-sm font-medium">{ev.title}</p>
                            <p className="text-slate-500 text-xs">{ev.location_name}</p>
                          </td>
                          <td className="px-5 py-3">
                            <Badge className="text-xs border border-slate-700 text-slate-400">{ev.status}</Badge>
                          </td>
                          <td className="px-5 py-3">
                            <Select
                              value={ev.pack_id || "none"}
                              onValueChange={(v) => handleAssignPack(ev.id, v)}
                            >
                              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white text-sm w-48">
                                <SelectValue placeholder="Sin pack" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800">
                                <SelectItem value="none">Sin pack</SelectItem>
                                {packs.filter(p => p.is_active).map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Pack Form Dialog */}
        <Dialog open={packDialog} onOpenChange={setPackDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">{editingPack ? "Editar pack" : "Nuevo pack"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">Nombre *</Label>
                <Input 
                  value={packForm.name} 
                  onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
                  placeholder="Ej: Básico, Estándar, Premium" 
                  className="bg-slate-800/50 border-slate-700 text-white" 
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">Descripción</Label>
                <Input 
                  value={packForm.description || ""} 
                  onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
                  placeholder="Descripción breve del pack" 
                  className="bg-slate-800/50 border-slate-700 text-white" 
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Funcionalidades incluidas</p>
                {FEATURES.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="text-slate-300 text-sm">{label}</Label>
                    <Switch 
                      checked={!!packForm[key as keyof Omit<Pack, 'id'>]} 
                      onCheckedChange={(v) => setPackForm({ ...packForm, [key]: v })} 
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Comisiones</p>
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Tipo</Label>
                  <Select 
                    value={packForm.commission_type} 
                    onValueChange={(v: "porcentaje" | "fijo") => setPackForm({ ...packForm, commission_type: v })}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                      <SelectItem value="fijo">Monto fijo ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-400 text-xs mb-1.5 block">
                      Entradas {packForm.commission_type === "porcentaje" ? "(%)" : "($)"}
                    </Label>
                    <Input 
                      type="number" 
                      value={packForm.commission_tickets}
                      onChange={(e) => setPackForm({ ...packForm, commission_tickets: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-800/50 border-slate-700 text-white" 
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs mb-1.5 block">
                      Consumiciones {packForm.commission_type === "porcentaje" ? "(%)" : "($)"}
                    </Label>
                    <Input 
                      type="number" 
                      value={packForm.commission_consumptions}
                      onChange={(e) => setPackForm({ ...packForm, commission_consumptions: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-800/50 border-slate-700 text-white" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <Label className="text-slate-300 text-sm">Pack activo</Label>
                <Switch 
                  checked={!!packForm.is_active} 
                  onCheckedChange={(v) => setPackForm({ ...packForm, is_active: v })} 
                />
              </div>

              <Button 
                onClick={handleSavePack} 
                disabled={saving || !packForm.name}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingPack ? "Guardar cambios" : "Crear pack")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
