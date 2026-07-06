"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, ArrowLeft, Loader2, CheckCircle2, Ticket, MapPin, Video, Search } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { UploadButton } from "@/utils/uploadthing";

const MapSelector = dynamic(() => import("@/components/events/MapSelector"), {
  ssr: false,
  loading: () => <div className="h-48 w-full bg-slate-900 animate-pulse rounded-xl flex items-center justify-center text-slate-500 text-xs">Cargando mapa interactivo...</div>
});

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
  type: "PRESENCIAL" | "STREAMING" | "HIBRIDO";
  location_name: string;
  location_address: string;
  latitude: number | null;
  longitude: number | null;
  streaming_url: string;
  streaming_key: string;
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

// 1. 📦 Subcomponente interno que contiene toda la lógica del formulario
function FormularioEvento() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id");
  const isEditMode = !!eventId;

  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);

  const isLoadingRef = useRef(false);

  const [event, setEvent] = useState<Event>({
    title: "", description: "", date_time: "", end_date_time: "",
    type: "PRESENCIAL",
    location_name: "", location_address: "",
    latitude: -31.7413, longitude: -60.5115,
    streaming_url: "", streaming_key: "",
    category: "musica", banner_url: "", status: "borrador", featured: false,
    max_concurrent: 50, queue_active: false,
  });

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { name: "General", description: "", price: 0, stock_total: 100, max_per_user: 4 },
  ]);

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { "User-Agent": "TicketNow-App" } }
      );
      if (!response.ok) return;
      const data = await response.json();
      
      if (data.display_name) {
        const street = data.address.road || "";
        const houseNumber = data.address.house_number || "";
        const city = data.address.city || data.address.town || data.address.village || "";
        
        const shortAddress = [street, houseNumber, city].filter(Boolean).join(", ");
        
        setEvent(prev => ({ 
          ...prev, 
          location_address: shortAddress || data.display_name 
        }));
      }
    } catch (err) {
      console.error("Error al reverse-geocodificar coordenadas:", err);
    }
  };

  const handleMapChange = (lat: number, lng: number) => {
    setEvent(prev => ({ ...prev, latitude: lat, longitude: lng }));
    fetchAddressFromCoords(lat, lng);
  };

  const handleSearchAddress = async () => {
    if (!event.location_address.trim()) {
      toast.error("Ingresá una dirección antes de buscar");
      return;
    }

    setSearchingAddress(true);
    try {
      const queryAddress = `${event.location_address}, Entre Rios, Argentina`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryAddress)}&limit=1`,
        { headers: { "User-Agent": "TicketNow-App" } }
      );
      
      const data = await response.json();

      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        
        setEvent(prev => ({
          ...prev,
          latitude: newLat,
          longitude: newLng
        }));
        toast.success("Ubicación encontrada y marcador actualizado");
      } else {
        toast.error("No se encontraron coordenadas precisas para esa dirección.");
      }
    } catch (error) {
      console.error("Error al buscar coordenadas:", error);
      toast.error("Error de conexión al buscar la dirección");
    } finally {
      setSearchingAddress(false);
    }
  };

  const loadData = useCallback(async (currentUser: any) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      const organizerResponse = await fetch(`/api/organizers?userId=${currentUser.id}`);
      const organizersData = await organizerResponse.json();

      if (organizersData.error || !organizersData.length) {
        toast.error("No se encontró tu cuenta de organizador");
        router.push('/SerOrganizador');
        return;
      }

      setOrganizer(organizersData[0]);

      if (isEditMode) {
        const eventResponse = await fetch(`/api/events/${eventId}`);
        if (!eventResponse.ok) throw new Error("No se pudo obtener el evento");

        const eventData = await eventResponse.json();

        setEvent({
          title: eventData.title || "",
          description: eventData.description || "",
          date_time: eventData.dateTime ? eventData.dateTime.substring(0, 16) : "",
          end_date_time: eventData.endDateTime ? eventData.endDateTime.substring(0, 16) : "",
          type: eventData.type || "PRESENCIAL",
          location_name: eventData.locationName || "",
          location_address: eventData.locationAddress || "",
          latitude: eventData.latitude !== null && eventData.latitude !== undefined ? eventData.latitude : -31.7413,
          longitude: eventData.longitude !== null && eventData.longitude !== undefined ? eventData.longitude : -60.5115,
          streaming_url: eventData.streamingUrl || "",
          streaming_key: eventData.streamingKey || "",
          category: eventData.category || "musica",
          banner_url: eventData.bannerUrl || "",
          status: eventData.status || "borrador",
          featured: eventData.featured || false,
          max_concurrent: eventData.maxConcurrent ?? 50,
          queue_active: eventData.queueActive ?? false,
        });

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

    if (user && !isLoadingRef.current && !organizer) {
      loadData(user);
    }
  }, [isLoadingAuth, isAuthenticated, user, router, loadData, organizer]);

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

  const handleSave = async () => {
    if (!organizer) return;

    if (!event.title.trim() || !event.date_time) {
      toast.error("Por favor, completa los campos requeridos");
      return;
    }
    if (event.type === "PRESENCIAL" && !event.location_name.trim()) {
      toast.error("El nombre del lugar físico es obligatorio");
      return;
    }
    if (event.type === "STREAMING" && !event.streaming_url.trim()) {
      toast.error("La URL de streaming es obligatoria");
      return;
    }

    setSaving(true);

    try {
      const eventData = {
        title: event.title,
        description: event.description,
        dateTime: event.date_time,
        endDateTime: event.end_date_time,
        type: event.type,
        locationName: event.type === "PRESENCIAL" ? event.location_name : "Transmisión en Vivo",
        locationAddress: event.type === "PRESENCIAL" ? event.location_address : "Virtual",
        latitude: event.type === "PRESENCIAL" ? event.latitude : null,
        longitude: event.type === "PRESENCIAL" ? event.longitude : null,
        streamingUrl: event.type === "STREAMING" ? event.streaming_url : null,
        streamingKey: event.type === "STREAMING" ? event.streaming_key : null,
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
      toast.success(isEditMode ? "Evento actualizado" : "Evento creado exitosamente");

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
      type: "PRESENCIAL", location_name: "", location_address: "",
      latitude: -31.7413, longitude: -60.5115, streaming_url: "", streaming_key: "",
      category: "musica", banner_url: "", status: "borrador", featured: false,
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
          <h2 className="text-2xl font-bold text-white mb-3">¡Formulario Guardado!</h2>
          <p className="text-slate-400 mb-6">El evento fue procesado con éxito.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigateToPage("DashboardVentas")} className="bg-gradient-to-r from-violet-600 to-purple-600 border-0">
              Ir al Dashboard
            </Button>
            <Button variant="outline" onClick={resetForm} className="border-slate-700 text-slate-300 hover:bg-slate-800">
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
        <Button variant="ghost" onClick={() => navigateToPage("DashboardVentas")} className="text-slate-400 hover:text-white mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Button>

        <h1 className="text-3xl font-bold text-white mb-8">
          {isEditMode ? "Editar Evento" : "Crear Evento"}
        </h1>

        <div className="space-y-6">
          {/* Información General */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Información General</h3>
            <div className="space-y-4">
              
              {/* SELECTOR TIPO DE EVENTO */}
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">Tipo de Evento</Label>
                <Select value={event.type} onValueChange={(v: "PRESENCIAL" | "STREAMING") => setEvent({ ...event, type: v })}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="PRESENCIAL">
                      <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-400" /> Presencial / Físico</span>
                    </SelectItem>
                    <SelectItem value="STREAMING">
                      <span className="flex items-center gap-2"><Video className="w-4 h-4 text-violet-400" /> Transmisión Online (Streaming)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              {/* RENDERIZADO CONDICIONAL SEGÚN EL TIPO DE EVENTO */}
              {event.type === "PRESENCIAL" ? (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400 text-xs mb-1.5 block">Nombre del Lugar *</Label>
                      <Input
                        value={event.location_name}
                        onChange={(e) => setEvent({ ...event, location_name: e.target.value })}
                        placeholder="Estadio, Teatro, Club..."
                        className="bg-slate-800/50 border-slate-700 text-white"
                      />
                    </div>
                    
                    {/* INPUT DE DIRECCIÓN CON BOTÓN DE BÚSQUEDA ASOCIADO */}
                    <div>
                      <Label className="text-slate-400 text-xs mb-1.5 block">Dirección</Label>
                      <div className="flex gap-2">
                        <Input
                          value={event.location_address}
                          onChange={(e) => setEvent({ ...event, location_address: e.target.value })}
                          placeholder="Calle 1234, Paraná"
                          className="bg-slate-800/50 border-slate-700 text-white"
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          onClick={handleSearchAddress}
                          disabled={searchingAddress}
                          className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white px-3"
                          title="Ubicar dirección escrita en el mapa"
                        >
                          {searchingAddress ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* MAPA INTERACTIVO Y COORDENADAS */}
                  <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl space-y-3">
                    <Label className="text-slate-400 text-xs block">Ubicación Geográfica (Hacé clic en el mapa para ajustar el marcador)</Label>
                    <MapSelector
                      lat={event.latitude || -31.7413}
                      lng={event.longitude || -60.5115}
                      onChange={handleMapChange}
                    />
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <div>Latitud: <span className="text-slate-300 font-mono">{event.latitude?.toFixed(6)}</span></div>
                      <div>Longitud: <span className="text-slate-300 font-mono">{event.longitude?.toFixed(6)}</span></div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-2 bg-slate-950/20 p-4 border border-violet-900/20 rounded-xl">
                  <div>
                    <Label className="text-violet-400 text-xs mb-1.5 block">URL de la Transmisión *</Label>
                    <Input
                      value={event.streaming_url}
                      onChange={(e) => setEvent({ ...event, streaming_url: e.target.value })}
                      placeholder="https://vimeo.com/event/... o YouTube Live"
                      className="bg-slate-800/50 border-violet-800/40 text-white focus-visible:ring-violet-500"
                    />
                  </div>
                  <div>
                    <Label className="text-violet-400 text-xs mb-1.5 block">Clave o Token de acceso general (Opcional)</Label>
                    <Input
                      value={event.streaming_key}
                      onChange={(e) => setEvent({ ...event, streaming_key: e.target.value })}
                      placeholder="Contraseña del feed de video"
                      className="bg-slate-800/50 border-violet-800/40 text-white focus-visible:ring-violet-500"
                    />
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Categoría</Label>
                  <Select value={event.category as string} onValueChange={(v) => setEvent({ ...event, category: v })}>
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
                      allowedContent: "text-slate-500 text-xs hidden",
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
                      <img src={event.banner_url} className="w-full h-full object-cover" alt="Event banner" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sala de espera */}
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
                <Switch checked={event.queue_active} onCheckedChange={(v) => setEvent({ ...event, queue_active: v })} />
                <p className="text-xs text-slate-500 sm:col-span-2">Si está activo, todos pasan por la sala aunque haya cupo libre.</p>
              </div>
            </div>
          </motion.div>

          {/* Tipos de Entrada */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-violet-400" /> Tipos de Entrada
              </h3>
              <Button variant="outline" size="sm" onClick={addTicketType} className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1">
                <Plus className="w-3 h-3" /> Agregar
              </Button>
            </div>

            <div className="space-y-4">
              {ticketTypes.map((tt, i) => (
                <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500 font-medium">Tipo {i + 1}</span>
                    {ticketTypes.length > 1 && (
                      <button onClick={() => removeTicketType(i)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-slate-500 text-xs mb-1 block">Nombre</Label>
                      <Input value={tt.name} onChange={(e) => updateTicketType(i, "name", e.target.value)} placeholder="General, VIP..." className="bg-slate-900/50 border-slate-700 text-white text-sm" />
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs mb-1 block">Precio ($)</Label>
                      <Input type="number" value={tt.price} onChange={(e) => updateTicketType(i, "price", parseFloat(e.target.value) || 0)} className="bg-slate-900/50 border-slate-700 text-white text-sm" />
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs mb-1 block">Stock total</Label>
                      <Input type="number" value={tt.stock_total} onChange={(e) => updateTicketType(i, "stock_total", parseInt(e.target.value) || 0)} className="bg-slate-900/50 border-slate-700 text-white text-sm" />
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs mb-1 block">Máx. por persona</Label>
                      <Input type="number" value={tt.max_per_user || 4} onChange={(e) => updateTicketType(i, "max_per_user", parseInt(e.target.value) || 1)} min={1} max={20} className="bg-slate-900/50 border-slate-700 text-white text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Guardar */}
          <Button
            onClick={handleSave}
            disabled={saving || !event.title || !event.date_time}
            className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg text-base"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Guardar Evento</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// 2. 🛡️ Exportación por defecto envuelta en Suspense para mitigar problemas con useSearchParams()
export default function CrearEvento() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      }
    >
      <FormularioEvento />
    </Suspense>
  );
}