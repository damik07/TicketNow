'use client';

import React, { useState, useEffect } from "react";
import HeroSection from "@/components/landing/HeroSection";
import FeaturedSlider from "@/components/landing/FeaturedSlider";
import CategoryFilter from "@/components/landing/CategoryFilter";
import EventCard from "@/components/landing/EventCard";
import { Loader2 } from "lucide-react";

type Category = "musica" | "deportes" | "teatro" | "conferencia" | "festival" | "fiesta" | "gastronomia" | "otro";

// 1. Corregimos la interfaz a camelCase para alinearnos perfectamente con Prisma y el Slider
interface Event {
  id: string;
  title: string;
  dateTime: string;       // Cambiado de date_time
  locationName: string;   // Cambiado de location_name
  category?: Category;
  bannerUrl?: string;     // Cambiado de banner_url
  minPrice?: number;      // Cambiado de min_price
  packId?: string | null;  // Identificador de paquete premium para destacados
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const eventsData = await response.json();
        
        setEvents(eventsData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load events:', error);
        setLoading(false);
      }
    };
    
    loadEvents();
  }, []);

  // 2. Filtro corregido apuntando a las nuevas propiedades de Prisma (con opcionales seguros)
  const filtered = events.filter((ev) => {
    const matchSearch =
      !searchQuery ||
      ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.locationName?.toLowerCase().includes(searchQuery.toLowerCase());

    const currentEventCat = ev.category?.toLowerCase().trim() || "";
    const selectedCat = category.toLowerCase().trim();

    const matchCat = selectedCat === "all" || currentEventCat === selectedCat;

    return matchSearch && matchCat;
  });

  // 3. Lógica inteligente de destacados:
  // Filtra primero los eventos que tienen un pack asignado (Destacados/Premium).
  // Si todavía no hay eventos con pack asignados, toma los primeros 4 para mantener el Home vistoso.
  const premiumEvents = events.filter((ev) => ev.packId !== undefined && ev.packId !== null);
  const featured = premiumEvents.length > 0 ? premiumEvents : events.slice(0, 4);

  return (
    <>
      <HeroSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={() => {
          document.getElementById("events-grid")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 relative z-10">
        {/* Featured */}
        {featured.length > 0 && (
          <section className="mb-16">
            <FeaturedSlider events={featured} />
          </section>
        )}

        {/* Events Grid */}
        <section id="events-grid" className="pb-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Próximos Eventos</h2>
              <p className="text-slate-500 mt-1">Encontrá lo que buscás</p>
            </div>
          </div>

          <div className="mb-8">
            <CategoryFilter selected={category} onChange={setCategory} />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 text-lg">No se encontraron eventos</p>
              <p className="text-slate-600 text-sm mt-2">Probá con otra búsqueda o categoría</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((event, i) => (
                // Pasamos las propiedades correctas. 
                // Asegurate de que dentro de EventCard también uses camelCase (event.bannerUrl, etc.)
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}