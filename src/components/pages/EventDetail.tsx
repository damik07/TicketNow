"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TicketSelector from "@/components/events/TicketSelector";
import { Calendar, MapPin, ArrowLeft, Loader2, AlertTriangle, Navigation } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import { displayLocalDate } from "@/utils/date";

interface Event {
  id: string;
  title: string;
  description: string;
  date_time: string;
  location_name: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  category: string;
  banner_url?: string;
  status: string;
  featured: boolean;
  max_tickets_per_user?: number;
}

interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  price: number;
  stock_total: number;
  stock_available: number;
  max_per_user?: number;
  sort_order: number;
}

interface ApiTicketType {
  id: string;
  eventId?: string;
  event_id?: string;
  name: string;
  description?: string;
  price: number;
  stockTotal?: number;
  stock_total?: number;
  stockAvailable?: number;
  stock_available?: number;
  max_tickets_per_user?: number | string;
  maxPerUser?: number;
  max_per_user?: number;
  sortOrder?: number;
  sort_order?: number;
}

const CATEGORY_LABELS = {
  musica: "Música", deportes: "Deportes", teatro: "Teatro", conferencia: "Conferencia",
  festival: "Festival", fiesta: "Fiesta", gastronomia: "Gastronomía", otro: "Otro"
};

function EventDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("id");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checkingQueue, setCheckingQueue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  const [alreadyBought, setAlreadyBought] = useState<number>(0);
  const [boughtByTicketType, setBoughtByTicketType] = useState<Record<string, number>>({});
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // 1. Carga de Evento y Mapeo Seguro de Atributos (camelCase / snake_case)
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!eventId) return;

        const [eventResponse, ticketTypesResponse] = await Promise.all([
          fetch(`/api/events?eventId=${eventId}`),
          fetch(`/api/tickets/types?eventId=${eventId}`)
        ]);

        const eventData = await eventResponse.json();
        const ticketTypesData = await ticketTypesResponse.json();

        const rawEvent = Array.isArray(eventData) ? eventData[0] : eventData;

        if (rawEvent) {
          // Normalización estricta de variables de la API
          const normalizedEvent: Event = {
            id: rawEvent.id,
            title: rawEvent.title,
            description: rawEvent.description || "",
            date_time: rawEvent.dateTime || rawEvent.date_time || rawEvent.date || "",
            location_name: rawEvent.locationName || rawEvent.location_name || "Lugar sin especificar",
            location_address: rawEvent.locationAddress || rawEvent.location_address || "",
            location_lat: rawEvent.locationLat !== undefined ? Number(rawEvent.locationLat) : (rawEvent.location_lat ? Number(rawEvent.location_lat) : undefined),
            location_lng: rawEvent.locationLng !== undefined ? Number(rawEvent.locationLng) : (rawEvent.location_lng ? Number(rawEvent.location_lng) : undefined),
            category: rawEvent.category || "",
            banner_url: rawEvent.bannerUrl || rawEvent.banner_url || "",
            status: rawEvent.status || "activo",
            featured: Boolean(rawEvent.featured),
            max_tickets_per_user: rawEvent.maxTicketsPerUser ?? rawEvent.max_tickets_per_user ?? 4,
          };
          setEvent(normalizedEvent);
        }

        if (Array.isArray(ticketTypesData)) {
          const mappedTickets = ticketTypesData.map((tt: ApiTicketType) => ({
            id: tt.id,
            event_id: tt.eventId || tt.event_id || "",
            name: tt.name,
            description: tt.description,
            price: tt.price,
            stock_total: tt.stockTotal || tt.stock_total || 0,
            stock_available: tt.stockAvailable !== undefined ? tt.stockAvailable : (tt.stock_available || 0),
            max_per_user: (tt.max_tickets_per_user !== undefined && tt.max_tickets_per_user !== null)
              ? Number(tt.max_tickets_per_user)
              : ((tt.maxPerUser || tt.max_per_user) ? Number(tt.maxPerUser || tt.max_per_user) : undefined),
            sort_order: tt.sortOrder || tt.sort_order || 0,
          }));
          setTicketTypes(mappedTickets);
        }
      } catch (error) {
        console.error('Failed to load event data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]);

  // 2. Consulta de Historial de Compras
  useEffect(() => {
    const checkUserLimits = async () => {
      if (!eventId) return;
      try {
        const res = await fetch(`/api/auth/me?eventId=${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          setAlreadyBought(data.ticketsBought || 0);
          setBoughtByTicketType(data.ticketsBoughtByTypeId || {});
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("Error al verificar compras previas del usuario:", err);
      }
    };

    checkUserLimits();
  }, [eventId]);

  const maxEventLimit = event?.max_tickets_per_user !== undefined ? Number(event.max_tickets_per_user) : 4;
  const remainingEventLimit = Math.max(0, maxEventLimit - alreadyBought);

  // Límite ajustado por tipo restando las compras previas
  const ticketTypesWithRemaining = ticketTypes.map((tt) => {
    const boughtForThisType = boughtByTicketType[tt.id] || 0;
    const maxPerUserForType = tt.max_per_user ?? maxEventLimit;
    const maxRemainingForThisType = Math.max(0, maxPerUserForType - boughtForThisType);

    return {
      ...tt,
      max_per_user: maxRemainingForThisType,
    };
  });

  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);

  const handleSetQuantitiesSafe = (newQuantities: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    setQuantities((prev) => {
      const updated = typeof newQuantities === 'function' ? newQuantities(prev) : newQuantities;

      for (const tt of ticketTypesWithRemaining) {
        const qtyForThisType = updated[tt.id] || 0;
        const maxForThisTicket = Math.min(tt.max_per_user, tt.stock_available);

        if (qtyForThisType > maxForThisTicket) {
          alert(`No podés seleccionar más de ${maxForThisTicket} entradas del tipo "${tt.name}".`);
          return prev;
        }
      }

      const proposedTotal = Object.values(updated).reduce((a, b) => a + b, 0);
      if (proposedTotal > remainingEventLimit) {
        alert(`Límite excedido: Ya compraste ${alreadyBought} entrada(s). Solo podés seleccionar hasta ${remainingEventLimit} más.`);
        return prev;
      }
      return updated;
    });
  };

  const totalPrice = ticketTypes.reduce((sum, tt) => {
    return sum + (quantities[tt.id] || 0) * (tt.price || 0);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500">Evento no encontrado</p>
      </div>
    );
  }

  const eventDate = event.date_time ? displayLocalDate(event.date_time) : null;
  
  const isValidDate = eventDate && !isNaN(eventDate.getTime());

  // URL del Iframe de Google Maps
  const getGoogleMapsEmbedUrl = () => {
    if (event.location_lat && event.location_lng) {
      return `https://maps.google.com/maps?q=${event.location_lat},${event.location_lng}&z=15&output=embed`;
    }
    const query = encodeURIComponent(`${event.location_name} ${event.location_address || ''}`);
    return `https://maps.google.com/maps?q=${query}&z=15&output=embed`;
  };

  const handleBuyClick = async () => {
    if (totalQty === 0) {
      alert("Por favor, selecciona al menos una entrada");
      return;
    }

    setCheckingQueue(true);

    try {
      const res = await fetch("/api/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "No se pudo iniciar la compra. ¿Estás logueado?");
        setCheckingQueue(false);
        return;
      }

      const items = ticketTypes
        .filter((tt) => (quantities[tt.id] || 0) > 0)
        .map((tt) => ({
          ticket_type_id: tt.id,
          ticket_type_name: tt.name,
          quantity: quantities[tt.id],
          unit_price: tt.price,
          subtotal: quantities[tt.id] * tt.price,
        }));

      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(`checkout_items_${eventId}`, JSON.stringify(items));
        window.sessionStorage.setItem(`checkout_total_${eventId}`, totalPrice.toString());
      }

      const checkoutUrl = `/Checkout?event_id=${eventId}`;

      if (data.action === "allow_checkout") {
        if (typeof window !== "undefined" && window.sessionStorage) {
          window.sessionStorage.setItem(`queue_token_${eventId}`, data.sessionToken);
        }
        router.push(checkoutUrl);
      } else if (data.action === "redirect_to_queue") {
        if (typeof window !== "undefined" && window.sessionStorage && data.sessionToken) {
          window.sessionStorage.setItem(`queue_token_${eventId}`, data.sessionToken);
        }
        router.push(`/SalaEspera?event_id=${eventId}&checkout_url=${encodeURIComponent(checkoutUrl)}`);
      }

    } catch (error) {
      console.error("Error al procesar la compra:", error);
      alert("Error al procesar la compra. Inténtalo de nuevo.");
    } finally {
      setCheckingQueue(false);
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen">
      {/* Banner */}
      <div className="relative h-[32vh] sm:h-[40vh] max-h-[420px]">
        <img
          src={event.banner_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=80"}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="absolute top-6 left-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="bg-black/30 backdrop-blur-sm border border-white/10 text-white hover:bg-black/50 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-44 sm:-mt-52 relative z-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Información Principal */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {event.category && (
                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 border mb-4">
                  {CATEGORY_LABELS[event.category as keyof typeof CATEGORY_LABELS] || event.category}
                </Badge>
              )}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                {event.title}
              </h1>

              {/* 📅 BLOQUE DE FECHA Y HORA */}
              {isValidDate && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 border border-violet-500/20">
                    <Calendar className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">
                      {format(eventDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                    <p className="text-xs text-violet-300 font-medium mt-0.5">
                      {format(eventDate, "HH:mm")} hs
                    </p>
                  </div>
                </div>
              )}

              {/* 📍 BLOQUE DE UBICACIÓN EN DOS CUADRANTES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                
                {/* Cuadrante Izquierdo: Nombre del lugar y Dirección */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-violet-400 font-semibold text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>Ubicación del Evento</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{event.location_name}</h3>
                    {event.location_address ? (
                      <p className="text-sm text-slate-400 leading-snug">{event.location_address}</p>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Dirección no especificada</p>
                    )}
                  </div>

                  {event.location_lat && event.location_lng && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${event.location_lat},${event.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Abrir en Google Maps
                    </a>
                  )}
                </div>

                {/* Cuadrante Derecho: Mapa de Google Embed */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden h-48 md:h-auto min-h-[160px] relative">
                  <iframe
                    title="Mapa de ubicación"
                    width="100%"
                    height="100%"
                    className="absolute inset-0 border-0 filter grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                    loading="lazy"
                    allowFullScreen
                    src={getGoogleMapsEmbedUrl()}
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-3">Descripción</h3>
                <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                  {event.description || "Sin descripción disponible."}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Columna Derecha: Selección de Entradas */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-24"
            >
              <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-5">Entradas</h3>

                {isAuthenticated && alreadyBought > 0 && (
                  <div className={`p-3 rounded-xl mb-4 text-xs border flex items-start gap-2 ${remainingEventLimit === 0
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Historial del Evento</p>
                      <p className="mt-0.5">
                        Ya registramos <strong>{alreadyBought}</strong> entrada(s) aprobada(s) a tu nombre.
                        {remainingEventLimit === 0
                          ? " Alcanzaste el límite máximo permitido."
                          : ` Podés adquirir hasta ${remainingEventLimit} más.`}
                      </p>
                    </div>
                  </div>
                )}

                <TicketSelector
                  ticketTypes={ticketTypesWithRemaining}
                  quantities={quantities}
                  setQuantities={handleSetQuantitiesSafe}
                  maxAllowedItems={remainingEventLimit}
                />

                {(totalQty > 0 || remainingEventLimit === 0) && (
                  <div className="mt-6 pt-5 border-t border-slate-800">
                    {totalQty > 0 && (
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-slate-400">{totalQty} entrada{totalQty > 1 ? "s" : ""}</span>
                        <span className="text-xl font-bold text-white">
                          ${totalPrice.toLocaleString("es-AR")}
                        </span>
                      </div>
                    )}
                    <Button
                      onClick={handleBuyClick}
                      disabled={checkingQueue || remainingEventLimit === 0}
                      className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg shadow-violet-500/25 text-base font-medium disabled:opacity-50"
                    >
                      {checkingQueue ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : remainingEventLimit === 0 ? (
                        "Límite Máximo Alcanzado"
                      ) : (
                        "Comprar Entradas"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventDetail() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    }>
      <EventDetailContent />
    </React.Suspense>
  );
}