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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Edit, Trash2, Package, Loader2, QrCode, Users, ShoppingBag, Ticket } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  role: string;
}

/** Valores alineados con Prisma `PackPercentApplyMode` (en DB se guardan las etiquetas en español vía @map). */
type PackPercentApplyMode = "ADICIONA_AL_PRECIO" | "DEDUCE_DEL_PRECIO";

interface Pack {
  id: string;
  name: string;
  description?: string;
  hasPhysicalTickets: boolean;
  hasDigitalTickets: boolean;
  hasQrValidation: boolean;
  hasConsumptions: boolean;
  hasStaffManagement: boolean;
  commissionType: "porcentaje" | "fijo";
  commissionTickets: number;
  commissionConsumptions: number;
  ticketPercentApply: PackPercentApplyMode;
  consumptionPercentApply: PackPercentApplyMode;
  isActive: boolean;
}

interface Event {
  id: string;
  title: string;
  locationName: string;
  status: string;
  packId?: string;
}

const defaultPack: Omit<Pack, 'id'> = {
  name: "", description: "",
  hasPhysicalTickets: true, hasDigitalTickets: false,
  hasQrValidation: false, hasConsumptions: false, hasStaffManagement: false,
  commissionType: "porcentaje", commissionTickets: 0, commissionConsumptions: 0,
  ticketPercentApply: "ADICIONA_AL_PRECIO",
  consumptionPercentApply: "ADICIONA_AL_PRECIO",
  isActive: true,
};

const FEATURES = [
  { key: "hasPhysicalTickets", label: "Entradas físicas" },
  { key: "hasDigitalTickets", label: "Entradas digitales" },
  { key: "hasQrValidation", label: "Validación QR" },
  { key: "hasConsumptions", label: "Consumiciones con saldo" },
  { key: "hasStaffManagement", label: "Gestión de staff" },
];

function normalizePackFromApi(raw: Record<string, unknown>): Pack {
  const p = raw as unknown as Pack;
  
  return {
    ...p,
    ticketPercentApply:
      (p.ticketPercentApply as string) === "DEDUCE_DEL_PRECIO" || (p.ticketPercentApply as string) === "DEDUCTS_FROM_PRICE"
        ? "DEDUCE_DEL_PRECIO"
        : "ADICIONA_AL_PRECIO",
    consumptionPercentApply:
      (p.consumptionPercentApply as string) === "DEDUCE_DEL_PRECIO" || (p.consumptionPercentApply as string) === "DEDUCTS_FROM_PRICE"
        ? "DEDUCE_DEL_PRECIO"
        : "ADICIONA_AL_PRECIO",
  };
}

function percentApplyLabel(mode: PackPercentApplyMode): string {
  return mode === "DEDUCE_DEL_PRECIO"
    ? "Deduce del precio (comprador paga el precio publicado; organizador neto)"
    : "Adiciona al precio (comprador paga precio + comisión)";
}

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
  const router = useRouter();

  useEffect(() => {

    let isMounted = true;

    const load = async () => {
      try {
        // 1. Pedimos la sesión con un timestamp para romper cualquier caché rebelde
        const response = await fetch(`/api/auth/me?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache' }
        });

        if (!response.ok) {
          if (isMounted) router.push('/Login');
          return;
        }

        const data = await response.json();
        const currentRole = data?.role || data?.user?.role;

        // 2. VALIDACIÓN CRÍTICA: Forzamos la comparación
        if (!currentRole || String(currentRole).toUpperCase() !== 'ADMIN') {
          console.warn("ACCESO DENEGADO:", currentRole);
          if (isMounted) {
            toast.error('No tienes permisos de administrador');
            router.push('/');
          }
          return;
        }

        // 3. Solo si es ADMIN, seguimos cargando el resto
        if (isMounted) {
          setUser(data.user || data);

          try {
            const [packsRes, eventsRes] = await Promise.all([
              fetch('/api/packs'),
              fetch('/api/events?admin=true')
            ]);

            // Verificar respuestas
            if (!packsRes.ok) {
              console.error('Error fetching packs:', packsRes.status);
              toast.error('Error al cargar los packs');
            }
            if (!eventsRes.ok) {
              console.error('Error fetching events:', eventsRes.status);
              toast.error('Error al cargar los eventos');
            }

            const packsData = packsRes.ok ? await packsRes.json() : [];
            const eventsData = eventsRes.ok ? await eventsRes.json() : [];

            setPacks((packsData || []).map((x: Record<string, unknown>) => normalizePackFromApi(x)));
            setEvents(eventsData || []);
          } catch (fetchError) {
            console.error('Error fetching data:', fetchError);
            toast.error('Error al cargar los datos');
            // En caso de error, setear arrays vacíos para que no quede cargando indefinidamente
            setPacks([]);
            setEvents([]);
          } finally {
            setLoading(false);
            setLoadingPacks(false);
            setLoadingEvents(false);
          }
        }
      } catch (error) {
        console.error('Error crítico:', error);
        if (isMounted) {
          // Asegurarse de detener todos los estados de loading
          setLoading(false);
          setLoadingPacks(false);
          setLoadingEvents(false);
          router.push('/');
        }
      }
    };

    load();
    return () => { isMounted = false; };
  }, [router]);

  // Si está cargando o no hay usuario, MOSTRAR SOLO EL LOADER
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
        <p className="text-slate-400 animate-pulse">Verificando credenciales...</p>
      </div>
    );
  }

  const openCreate = () => {
    setEditingPack(null);
    setPackForm(defaultPack);
    setPackDialog(true);
  };

  const openEdit = (pack: Pack) => {
    setEditingPack(pack);
    const n = normalizePackFromApi(pack as unknown as Record<string, unknown>);
    const { id: _id, ...formOnly } = n;
    setPackForm(formOnly);
    setPackDialog(true);
  };

  const handleSavePack = async () => {
    if (!packForm.name.trim()) {
      toast.error("El nombre del pack es requerido");
      return;
    }

    setSaving(true);

    try {
      const packData = {
        name: packForm.name,
        description: packForm.description,
        hasPhysicalTickets: packForm.hasPhysicalTickets,
        hasDigitalTickets: packForm.hasDigitalTickets,
        hasQrValidation: packForm.hasQrValidation,
        hasConsumptions: packForm.hasConsumptions,
        hasStaffManagement: packForm.hasStaffManagement,
        commissionType: packForm.commissionType,
        commissionTickets: packForm.commissionTickets,
        commissionConsumptions: packForm.commissionConsumptions,
        ticketPercentApply: packForm.ticketPercentApply,
        consumptionPercentApply: packForm.consumptionPercentApply,
        isActive: packForm.isActive,
      };

      let response;
      if (editingPack) {
        response = await fetch(`/api/packs?id=${editingPack.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(packData)
        });
      } else {
        response = await fetch('/api/packs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(packData)
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save pack');
      }

      const savedPack = await response.json();

      if (editingPack) {
        setPacks(prev => prev.map(p => p.id === editingPack.id ? normalizePackFromApi(savedPack as unknown as Record<string, unknown>) : p));
        toast.success("Pack actualizado");
      } else {
        setPacks(prev => [...prev, normalizePackFromApi(savedPack as unknown as Record<string, unknown>)]);
        toast.success("Pack creado");
      }

      setSaving(false);
      setPackDialog(false);
    } catch (error) {
      setSaving(false);
      toast.error(error instanceof Error ? error.message : "Error al guardar el pack");
    }
  };

  const handleDeletePack = async (pack: Pack) => {
    try {
      const response = await fetch(`/api/packs?id=${pack.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete pack');
      }

      setPacks(prev => prev.filter(p => p.id !== pack.id));
      toast.success("Pack eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar el pack");
    }
  };

  const handleAssignPack = async (eventId: string, packId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packId: packId === "none" ? null : packId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign pack');
      }

      setEvents(prev => prev.map(ev =>
        ev.id === eventId
          ? { ...ev, packId: packId === "none" ? undefined : packId }
          : ev
      ));
      toast.success("Pack asignado al evento");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al asignar el pack");
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
                          <Badge className={`border text-xs ${pack.isActive ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/30"}`}>
                            {pack.isActive ? "Activo" : "Inactivo"}
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
                      Comisión entradas: {pack.commissionType === "porcentaje" ? `${pack.commissionTickets}%` : `$${pack.commissionTickets}`}
                      {pack.commissionType === "porcentaje" && (
                        <span className="text-slate-600"> ({percentApplyLabel(pack.ticketPercentApply)})</span>
                      )}
                      {pack.hasConsumptions && (
                        <>
                          {" "}· Consumiciones: {pack.commissionType === "porcentaje" ? `${pack.commissionConsumptions}%` : `$${pack.commissionConsumptions}`}
                          {pack.commissionType === "porcentaje" && (
                            <span className="text-slate-600"> ({percentApplyLabel(pack.consumptionPercentApply)})</span>
                          )}
                        </>
                      )}
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
                            <p className="text-slate-500 text-xs">{ev.locationName}</p>
                          </td>
                          <td className="px-5 py-3">
                            <Badge className="text-xs border border-slate-700 text-slate-400">{ev.status}</Badge>
                          </td>
                          <td className="px-5 py-3">
                            <Select
                              value={ev.packId || "none"}
                              onValueChange={(v) => handleAssignPack(ev.id, v)}
                            >
                              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white text-sm w-48">
                                <SelectValue placeholder="Sin pack" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800">
                                <SelectItem value="none">Sin pack</SelectItem>
                                {packs.filter(p => p.isActive).map((p) => (
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
                    value={packForm.commissionType}
                    onValueChange={(v: "porcentaje" | "fijo") => setPackForm({ ...packForm, commissionType: v })}
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
                      Entradas {packForm.commissionType === "porcentaje" ? "(%)" : "($)"}
                    </Label>
                    <Input
                      type="number"
                      value={packForm.commissionTickets}
                      onChange={(e) => setPackForm({ ...packForm, commissionTickets: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs mb-1.5 block">
                      Consumiciones {packForm.commissionType === "porcentaje" ? "(%)" : "($)"}
                    </Label>
                    <Input
                      type="number"
                      value={packForm.commissionConsumptions}
                      onChange={(e) => setPackForm({ ...packForm, commissionConsumptions: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                </div>
                {packForm.commissionType === "porcentaje" && (
                  <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Entradas — cómo aplica el %</Label>
                      <RadioGroup
                        value={packForm.ticketPercentApply}
                        onValueChange={(v) =>
                          setPackForm({ ...packForm, ticketPercentApply: v as PackPercentApplyMode })
                        }
                        className="grid gap-2"
                      >
                        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-800 px-3 py-2 hover:bg-slate-800/40">
                          <RadioGroupItem value="ADICIONA_AL_PRECIO" className="mt-0.5" />
                          <span className="text-sm text-slate-300 leading-snug">
                            <strong className="text-violet-300">Adiciona al precio</strong> — el comprador paga precio publicado + comisión.
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-800 px-3 py-2 hover:bg-slate-800/40">
                          <RadioGroupItem value="DEDUCE_DEL_PRECIO" className="mt-0.5" />
                          <span className="text-sm text-slate-300 leading-snug">
                            <strong className="text-violet-300">Deduce del precio</strong> — el comprador paga solo el precio publicado; la comisión se retiene del monto (organizador neto).
                          </span>
                        </label>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2 border-t border-slate-800 pt-4">
                      <Label className="text-slate-300 text-sm">Consumiciones — cómo aplica el %</Label>
                      <p className="text-xs text-slate-500 mb-1">Independiente de las entradas; aplica a cargos de consumición.</p>
                      <RadioGroup
                        value={packForm.consumptionPercentApply}
                        onValueChange={(v) =>
                          setPackForm({ ...packForm, consumptionPercentApply: v as PackPercentApplyMode })
                        }
                        className="grid gap-2"
                      >
                        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-800 px-3 py-2 hover:bg-slate-800/40">
                          <RadioGroupItem value="ADICIONA_AL_PRECIO" className="mt-0.5" />
                          <span className="text-sm text-slate-300 leading-snug">
                            <strong className="text-violet-300">Adiciona al precio</strong> — quien consume paga monto + comisión.
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-800 px-3 py-2 hover:bg-slate-800/40">
                          <RadioGroupItem value="DEDUCE_DEL_PRECIO" className="mt-0.5" />
                          <span className="text-sm text-slate-300 leading-snug">
                            <strong className="text-violet-300">Deduce del precio</strong> — precio publicado para el consumidor; comisión retenida del monto (neto organizador).
                          </span>
                        </label>
                      </RadioGroup>
                    </div>
                  </div>
                )}
                {packForm.commissionType === "fijo" && (
                  <p className="text-xs text-slate-500">
                    Con comisión fija ($) no aplica sumar/retenér: el monto fijo se trata como cargo al comprador en la lógica de checkout (ver `pack-commission.ts`).
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <Label className="text-slate-300 text-sm">Pack activo</Label>
                <Switch
                  checked={!!packForm.isActive}
                  onCheckedChange={(v) => setPackForm({ ...packForm, isActive: v })}
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
