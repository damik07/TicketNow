'use client';

import React, { useState, useEffect } from "react";
import HeroSection from "@/components/landing/HeroSection";
import FeaturedSlider from "@/components/landing/FeaturedSlider";
import CategoryFilter from "@/components/landing/CategoryFilter";
import EventCard from "@/components/landing/EventCard";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Category = "musica" | "deportes" | "teatro" | "conferencia" | "festival" | "fiesta" | "gastronomia" | "otro";

interface Event {
  id: string;
  title: string;
  date_time?: string;
  location_name: string;
  category?: Category;
  banner_url?: string;
  min_price?: number;
  featured?: boolean;
}

interface CategoryOption {
  value: string;
  label: string;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        // Fetch events from API
        const response = await fetch('/api/events');
        const eventsData = await response.json();
        
        // Fetch categories from events
        const categoriesFromEvents = Array.from(
          new Set(eventsData.map((event: Event) => event.category).filter(Boolean)) as Set<string>
        ).map((category: string) => ({
          value: category,
          label: category.charAt(0).toUpperCase() + category.slice(1)
        }));
        
        // Add default categories if needed
        const allCategories = [
          { value: "musica", label: "Música" },
          { value: "deportes", label: "Deportes" },
          { value: "teatro", label: "Teatro" },
          { value: "conferencia", label: "Conferencia" },
          { value: "festival", label: "Festival" },
          { value: "fiesta", label: "Fiesta" },
          { value: "gastronomia", label: "Gastronomía" },
          { value: "otro", label: "Otro" },
        ];
        
        // Merge categories from events with default categories
        const mergedCategories = allCategories.filter(cat => 
          categoriesFromEvents.some(eventCat => eventCat.value === cat.value)
        );
        
        setCategories(mergedCategories);
        setEvents(eventsData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load events:', error);
        setLoading(false);
      }
    };
    
    loadEvents();
  }, []);

  const filtered = events.filter((ev) => {
    const matchSearch =
      !searchQuery ||
      ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.location_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = category === "all" || ev.category === category;
    return matchSearch && matchCat;
  });

  const featured = events.filter((ev) => ev.featured);

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
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
