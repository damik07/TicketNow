"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TicketSelector from "@/components/events/TicketSelector";
import { Calendar, MapPin, Clock, ArrowLeft, Share2, Heart, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";

interface Event {
  id: string;
  title: string;
  description: string;
  date_time: string;
  end_date_time?: string;
  location_name: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  category: string;
  banner_url?: string;
  status: string;
  featured: boolean;
  total_capacity?: number;
  min_price?: number;
}

interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  price: number;
  stock_total: number;
  stock_available: number;
  max_per_user: number;
  sort_order: number;
}

const QUEUE_THRESHOLD = 3; // Usuarios en fila activa para activar sala de espera

const CATEGORY_LABELS = {
  musica: "Música", deportes: "Deportes", teatro: "Teatro", conferencia: "Conferencia",
  festival: "Festival", fiesta: "Fiesta", gastronomia: "Gastronomía", otro: "Otro"
};

export default function EventDetail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const eventId = searchParams.get("id");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checkingQueue, setCheckingQueue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!eventId) return;

        // Fetch event and ticket types from API
        const [eventResponse, ticketTypesResponse] = await Promise.all([
          fetch(`/api/events?eventId=${eventId}`),
          fetch(`/api/tickets?eventId=${eventId}`)
        ]);

        const eventData = await eventResponse.json();
        const ticketTypesData = await ticketTypesResponse.json();

        setEvent(eventData[0] || null);
        setTicketTypes(ticketTypesData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load event data:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [eventId]);

  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);
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

  const eventDate = event.date_time ? new Date(event.date_time) : null;

  const buildCheckoutUrl = () => {
    const items = ticketTypes
      .filter((tt) => (quantities[tt.id] || 0) > 0)
      .map((tt) => ({
        ticket_type_id: tt.id,
        ticket_type_name: tt.name,
        quantity: quantities[tt.id],
        unit_price: tt.price,
        subtotal: quantities[tt.id] * tt.price,
      }));
    return `/Checkout?event_id=${eventId}&items=${encodeURIComponent(JSON.stringify(items))}&total=${totalPrice}`;
  };

  const handleBuyClick = async () => {
    if (totalQty === 0) {
      alert("Por favor, selecciona al menos una entrada");
      return;
    }

    setCheckingQueue(true);
    
    try {
      // TODO: Implement Next.js API call for queue checking
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate queue check
      const waitingInQueue = Math.random() > 0.7; // 30% chance of queue
      
      const checkoutUrl = buildCheckoutUrl();

      if (waitingInQueue) {
        // Hay alta demanda → redirigir a sala de espera
        router.push(`/SalaEspera?event_id=${eventId}&checkout_url=${encodeURIComponent(checkoutUrl)}`);
      } else {
        router.push(checkoutUrl);
      }
    } catch (error) {
      setCheckingQueue(false);
      alert("Error al procesar la compra");
    }
  };

  const navigateToPage = (page: string) => {
    router.push(`/${page}`);
  };

  return (
    <div className="bg-slate-950 min-h-screen">
      {/* Banner */}
      <div className="relative h-[50vh] sm:h-[60vh]">
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
            onClick={() => navigateToPage("")}
            className="bg-black/30 backdrop-blur-sm border border-white/10 text-white hover:bg-black/50 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left - Event Info */}
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

              <div className="flex flex-wrap gap-6 mb-8">
                {eventDate && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {format(eventDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                      <p className="text-xs text-slate-500">{format(eventDate, "HH:mm")} hs</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{event.location_name}</p>
                    {event.location_address && (
                      <p className="text-xs text-slate-500">{event.location_address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-3">Descripción</h3>
                <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                  {event.description || "Sin descripción disponible."}
                </p>
              </div>

              {/* Map placeholder */}
              {event.location_lat && event.location_lng && (
                <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Ubicación</h3>
                  <div className="rounded-xl overflow-hidden h-64 bg-slate-800 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-slate-600" />
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right - Ticket Purchase */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-24"
            >
              <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-5">Entradas</h3>

                <TicketSelector
                  ticketTypes={ticketTypes}
                  quantities={quantities}
                  setQuantities={setQuantities}
                />

                {totalQty > 0 && (
                  <div className="mt-6 pt-5 border-t border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-slate-400">{totalQty} entrada{totalQty > 1 ? "s" : ""}</span>
                      <span className="text-xl font-bold text-white">
                        ${totalPrice.toLocaleString("es-AR")}
                      </span>
                    </div>
                    <Button
                      onClick={handleBuyClick}
                      disabled={checkingQueue}
                      className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg shadow-violet-500/25 text-base font-medium"
                    >
                      {checkingQueue ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
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
