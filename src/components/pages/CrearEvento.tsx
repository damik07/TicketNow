"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [event, setEvent] = useState<Event>({
    title: "", description: "", date_time: "", end_date_time: "",
    location_name: "", location_address: "", category: "musica",
    banner_url: "", status: "borrador", featured: false,
  });

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { name: "General", description: "", price: 0, stock_total: 100, max_per_user: 4 },
  ]);

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !user) {
        router.push('/Login');
        return;
      }

      // Check if user has required role
      if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
        toast.error("No tienes permisos para crear eventos. Debes ser organizador.");
        router.push('/SerOrganizador');
        return;
      }

      try {
        // Get organizer data
        const organizerResponse = await fetch(`/api/organizers?userId=${user.id}`);
        const organizersData = await organizerResponse.json();
        
        if (organizersData.error || !organizersData.length) {
          toast.error("No se encontró tu cuenta de organizador");
          router.push('/SerOrganizador');
          return;
        }
        
        setOrganizer(organizersData[0]);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load organizer data:', error);
        toast.error("Error al cargar datos del organizador");
        router.push('/DashboardVentas');
      }
    };
    
    if (!isLoadingAuth) {
      loadData();
    }
  }, [isAuthenticated, user, isLoadingAuth, router]);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // TODO: Implement Next.js file upload
      // For now, create a mock URL
      const mockUrl = `https://images.unsplash.com/photo-${Date.now()}?w=400&q=80`;
      setEvent((prev) => ({ ...prev, banner_url: mockUrl }));
      toast.success("Imagen subida correctamente");
    } catch (error) {
      toast.error("Error al subir la imagen");
    }
  };

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
    if (!organizer) {
      toast.error("No tienes permisos para crear eventos");
      return;
    }

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
        ticketTypes: ticketTypes.map(tt => ({
          name: tt.name,
          description: tt.description,
          price: tt.price,
          stockTotal: tt.stock_total,
          maxPerUser: tt.max_per_user || 4,
        }))
      };

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      toast.success("Evento creado exitosamente");
      
      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push('/DashboardVentas');
      }, 2000);
    } catch (error) {
      console.error('Error creating event:', error);
      setSaving(false);
      toast.error("Error al crear el evento");
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

        <h1 className="text-3xl font-bold text-white mb-8">Crear Evento</h1>

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
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-400 hover:bg-slate-700 cursor-pointer transition-colors">
                    <Image className="w-4 h-4" />
                    Subir imagen
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleBannerUpload} 
                      className="hidden" 
                    />
                  </label>
                  {event.banner_url && (
                    <img 
                      src={event.banner_url} 
                      className="w-16 h-16 rounded-xl object-cover" 
                      alt="Event banner" 
                    />
                  )}
                </div>
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
