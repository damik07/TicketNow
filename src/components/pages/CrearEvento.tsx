"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, ArrowLeft, Image, Loader2, CheckCircle2, Ticket } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { UploadButton } from "@/utils/uploadthing";

interface User {
  id: string;
  full_name: string;
  role: string;
}

interface Organizer {
  id: string;
  user_id: string;
  business_name: string;
  verified: boolean;
}

interface Event {
  title: string;
  description: string;
  date_time: string;
  end_date_time: string;
  location_name: string;
  location_address: string;
  category: string;
  banner_url: string;
  status: string;
  featured: boolean;
  max_concurrent: number;
  queue_active: boolean;
}

interface TicketType {
  name: string;
  description: string;
  price: number;
  stock_total: number;
  max_per_user?: number;
}

const CATEGORIES = [
  { value: "musica", label: "Música" },
  { value: "deportes", label: "Deportes" },
  { value: "teatro", label: "Teatro" },
  { value: "conferencia", label: "Conferencia" },
  { value: "festival", label: "Festival" },
  { value: "fiesta", label: "Fiesta" },
  { value: "gastronomia", label: "Gastronomía" },
  { value: "otro", label: "Otro" },
];

export default function CrearEvento() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id"); // ✅ Captura correctamente el '?id=...' de la URL
  const isEditMode = !!eventId;

  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const isLoadingRef = useRef(false);

  // 1. Simplificamos loadData quitándole las dependencias que causan re-creaciones innecesarias.
  // Ya no necesita useCallback porque lo manejaremos dentro del useEffect o lo llamaremos de forma directa.
  // loadData unificado: Trae organizador y, si corresponde, los datos del evento a editar
  const [event, setEvent] = useState<Event>({
    title: "", description: "", date_time: "", end_date_time: "",
    location_name: "", location_address: "", category: "musica",
    banner_url: "", status: "borrador", featured: false,
    max_concurrent: 50, queue_active: false,
  });

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { name: "General", description: "", price: 0, stock_total: 100, max_per_user: 4 },
  ]);

  // loadData unificado y protegido
  const loadData = useCallback(async (currentUser: any) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      // 1. Cargar datos del Organizador
      const organizerResponse = await fetch(`/api/organizers?userId=${currentUser.id}`);
      const organizersData = await organizerResponse.json();

      if (organizersData.error || !organizersData.length) {
        toast.error("No se encontró tu cuenta de organizador");
        router.push('/SerOrganizador');
        return;
      }

      setOrganizer(organizersData[0]);

      // 2. Si estamos en modo EDICIÓN, cargamos los datos del evento previo
      if (isEditMode) {
        const eventResponse = await fetch(`/api/events/${eventId}`);
        if (!eventResponse.ok) throw new Error("No se pudo obtener el evento");

        const eventData = await eventResponse.json();

        // Mapeamos el camelCase de Prisma al snake_case del formulario
        setEvent({
          title: eventData.title || "",
          description: eventData.description || "",
          date_time: eventData.dateTime ? eventData.dateTime.substring(0, 16) : "",
          end_date_time: eventData.endDateTime ? eventData.endDateTime.substring(0, 16) : "",
          location_name: eventData.locationName || "",
          location_address: eventData.locationAddress || "",
          category: eventData.category || "musica",
          banner_url: eventData.bannerUrl || "",
          status: eventData.status || "borrador",
          featured: eventData.featured || false,
          max_concurrent: eventData.maxConcurrent ?? 50,
          queue_active: eventData.queueActive ?? false,
        });

        // Mapeamos también sus tickets asociados si existen
        if (eventData.ticketTypes && eventData.ticketTypes.length > 0) {
          setTicketTypes(eventData.ticketTypes.map((tt: any) => ({
            name: tt.name,
            description: tt.description || "",
            price: tt.price,
            stock_total: tt.stockTotal,
            max_per_user: tt.maxPerUser || 4
          })));
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error("Error al cargar los datos en el formulario");
      router.push('/DashboardVentas');
    } finally {
      isLoadingRef.current = false;
    }
  }, [router, isEditMode, eventId]);

  // Orquestador de la autenticación y carga de APIs
  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isAuthenticated || !user) {
      router.push('/Login');
      return;
    }

    if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
      toast.error("No tienes permisos para crear eventos. Debes ser organizador.");
      router.push('/SerOrganizador');
      return;
    }

    // Usamos una bandera local/ref para asegurarnos de llamar a loadData una única vez
    if (user && !isLoadingRef.current && !organizer) {
      loadData(user);
    }
  }, [isLoadingAuth, isAuthenticated, user, router, loadData]);


  const addTicketType = () => {
    setTicketTypes((prev) => [...prev, { name: "", description: "", price: 0, stock_total: 50, max_per_user: 4 }]);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTicketType = (index: number, field: keyof TicketType, value: any) => {
    setTicketTypes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Actualizamos handleSave para que haga POST (crear) o PUT (editar) según corresponda
  const handleSave = async () => {
    if (!organizer) return;
    if (!event.title.trim() || !event.date_time || !event.location_name.trim()) {
      toast.error("Por favor, completa los campos requeridos");
      return;
    }

    setSaving(true);

    try {
      const eventData = {
        title: event.title,
        description: event.description,
        dateTime: event.date_time,
        endDateTime: event.end_date_time,
        locationName: event.location_name,
        locationAddress: event.location_address,
        category: event.category,
        bannerUrl: event.banner_url,
        status: event.status,
        maxConcurrent: Math.max(1, Number(event.max_concurrent) || 50),
        queueActive: event.queue_active,
        ticketTypes: ticketTypes.map(tt => ({
          name: tt.name,
          description: tt.description,
          price: tt.price,
          stockTotal: tt.stock_total,
          maxPerUser: tt.max_per_user || 4,
        }))
      };

      // Si es edición usamos PUT a la ruta con ID, si es nuevo usamos POST a /api/events
      const url = isEditMode ? `/api/events/${eventId}` : '/api/events';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        setSaving(false);
        return;
      }

      setSaving(false);
      setSuccess(true);
      toast.success(isEditMode ? "Evento actualizado exitosamente" : "Evento creado exitosamente");

      setTimeout(() => {
        router.push('/DashboardVentas');
      }, 2000);
    } catch (error) {
      console.error('Error saving event:', error);
      setSaving(false);
      toast.error("Error al guardar el evento");
    }
  };

  const navigateToPage = (page: string) => {
    router.push(`/${page}`);
  };

  const resetForm = () => {
    setEvent({
      title: "", description: "", date_time: "", end_date_time: "",
      location_name: "", location_address: "", category: "musica",
      banner_url: "", status: "borrador", featured: false,
      max_concurrent: 50, queue_active: false,
    });
    setTicketTypes([{ name: "General", description: "", price: 0, stock_total: 100, max_per_user: 4 }]);
    setSuccess(false);
  };

  if (loading || isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">¡Evento creado!</h2>
          <p className="text-slate-400 mb-6">Tu evento fue creado exitosamente.</p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => navigateToPage("DashboardVentas")}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0"
            >
              Ir al Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={resetForm}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Crear otro evento
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-3xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigateToPage("DashboardVentas")}
          className="text-slate-400 hover:text-white mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Button>

        <h1 className="text-3xl font-bold text-white mb-8">
          {isEditMode ? "Editar Evento" : "Crear Evento"}
        </h1>

        <div className="space-y-6">
          {/* Basic Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Información General</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">Título *</Label>
                <Input
                  value={event.title}
                  onChange={(e) => setEvent({ ...event, title: e.target.value })}
                  placeholder="Nombre del evento"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">Descripción</Label>
                <Textarea
                  value={event.description}
                  onChange={(e) => setEvent({ ...event, description: e.target.value })}
                  placeholder="Describí tu evento..."
                  rows={4}
                  className="bg-slate-800/50 border-slate-700 text-white resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Fecha y hora inicio *</Label>
                  <Input
                    type="datetime-local"
                    value={event.date_time}
                    onChange={(e) => setEvent({ ...event, date_time: e.target.value })}
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Fecha y hora fin</Label>
                  <Input
                    type="datetime-local"
                    value={event.end_date_time}
                    onChange={(e) => setEvent({ ...event, end_date_time: e.target.value })}
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Lugar *</Label>
                  <Input
                    value={event.location_name}
                    onChange={(e) => setEvent({ ...event, location_name: e.target.value })}
                    placeholder="Nombre del lugar"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Dirección</Label>
                  <Input
                    value={event.location_address}
                    onChange={(e) => setEvent({ ...event, location_address: e.target.value })}
                    placeholder="Dirección"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Categoría</Label>
                  <Select value={event.category} onValueChange={(v) => setEvent({ ...event, category: v })}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Estado</Label>
                  <Select value={event.status} onValueChange={(v) => setEvent({ ...event, status: v })}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="publicado">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Banner */}
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">Banner del evento</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900/30 border border-slate-800 p-4 rounded-xl">

                  <UploadButton
                    endpoint="bannerUploader"
                    onClientUploadComplete={(res) => {
                      // res[0].url contiene la URL real en la nube que nos da UploadThing
                      const uploadedUrl = res?.[0]?.url;
                      if (uploadedUrl) {
                        setEvent((prev) => ({ ...prev, banner_url: uploadedUrl }));
                        toast.success("¡Imagen subida a la nube con éxito!");
                      }
                    }}
                    onUploadError={(error: Error) => {
                      toast.error(`Error al subir: ${error.message}`);
                    }}
                    appearance={{
                      button: "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-sm text-white px-4 py-2.5 rounded-xl transition-colors ut-ready:bg-violet-600 ut-uploading:bg-slate-800 ut-uploading:after:bg-violet-500",
                      allowedContent: "text-slate-500 text-xs hidden", // Oculta subtítulos automáticos para mantener el diseño limpio
                    }}
                    content={{
                      button({ ready, isUploading }) {
                        if (isUploading) return "Subiendo banner...";
                        if (ready) return "Seleccionar Imagen";
                        return "Cargando...";
                      },
                    }}
                  />

                  {event.banner_url && (
                    <div className="relative w-20 h-20 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-slate-700 flex-shrink-0 mx-auto sm:mx-0">
                      <img
                        src={event.banner_url}
                        className="w-full h-full object-cover"
                        alt="Event banner"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Cola virtual / checkout simultáneo */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Sala de espera y compra</h3>
            <p className="text-sm text-slate-500 mb-4">
              Limitá cuántas personas pueden estar en checkout al mismo tiempo. Cada turno dura 10 minutos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">Compradores simultáneos (maxConcurrent)</Label>
                <Input
                  type="number"
                  min={1}
                  value={event.max_concurrent}
                  onChange={(e) => setEvent({ ...event, max_concurrent: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-start sm:justify-center gap-2">
                <Label className="text-slate-300 text-sm">Forzar sala de espera virtual</Label>
                <Switch
                  checked={event.queue_active}
                  onCheckedChange={(v) => setEvent({ ...event, queue_active: v })}
                />
                <p className="text-xs text-slate-500 sm:col-span-2">
                  Si está activo, todos pasan por la sala aunque haya cupo libre.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Ticket Types */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-violet-400" /> Tipos de Entrada
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addTicketType}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1"
              >
                <Plus className="w-3 h-3" /> Agregar
              </Button>
            </div>

            <div className="space-y-4">
              {ticketTypes.map((tt, i) => (
                <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500 font-medium">Tipo {i + 1}</span>
                    {ticketTypes.length > 1 && (
                      <button
                        onClick={() => removeTicketType(i)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-slate-500 text-xs mb-1 block">Nombre</Label>
                      <Input
                        value={tt.name}
                        onChange={(e) => updateTicketType(i, "name", e.target.value)}
                        placeholder="General, VIP..."
                        className="bg-slate-900/50 border-slate-700 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs mb-1 block">Precio ($)</Label>
                      <Input
                        type="number"
                        value={tt.price}
                        onChange={(e) => updateTicketType(i, "price", parseFloat(e.target.value) || 0)}
                        className="bg-slate-900/50 border-slate-700 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs mb-1 block">Stock total</Label>
                      <Input
                        type="number"
                        value={tt.stock_total}
                        onChange={(e) => updateTicketType(i, "stock_total", parseInt(e.target.value) || 0)}
                        className="bg-slate-900/50 border-slate-700 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs mb-1 block">Máx. por persona</Label>
                      <Input
                        type="number"
                        value={tt.max_per_user || 4}
                        onChange={(e) => updateTicketType(i, "max_per_user", parseInt(e.target.value) || 1)}
                        min={1}
                        max={20}
                        className="bg-slate-900/50 border-slate-700 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Submit */}
          <Button
            onClick={handleSave}
            disabled={saving || !event.title || !event.date_time || !event.location_name}
            className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg shadow-violet-500/25 text-base"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Guardar Evento</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
