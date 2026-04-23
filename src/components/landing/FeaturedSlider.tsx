'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface Event {
  id: string;
  title: string;
  date_time?: string;
  location_name: string;
  banner_url?: string;
}

interface FeaturedSliderProps {
  events: Event[];
}

export default function FeaturedSlider({ events }: FeaturedSliderProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % events.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [events.length]);

  if (!events.length) return null;

  const event = events[current];
  const eventDate = event.date_time ? new Date(event.date_time) : null;

  return (
    <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/50">
      <div className="relative aspect-[21/9] sm:aspect-[21/8]">
        <AnimatePresence mode="wait">
          <motion.img
            key={current}
            src={event.banner_url || "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80"}
            alt={event.title}
            className="w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        <div className="absolute inset-0 flex items-end p-6 sm:p-10 lg:p-14">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 rounded-full px-3 py-1 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span className="text-xs font-medium text-violet-300">Destacado</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
              {event.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 mb-6">
              {eventDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-violet-400" />
                  {format(eventDate, "d 'de' MMMM, HH:mm", { locale: es })} hs
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-violet-400" />
                {event.location_name}
              </span>
            </div>
            <Link href={createPageUrl(`EventDetail?id=${event.id}`)}>
              <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg shadow-violet-500/25 px-8">
                Comprar Entradas
              </Button>
            </Link>
          </div>
        </div>

        {/* Controls */}
        {events.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((prev) => (prev - 1 + events.length) % events.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrent((prev) => (prev + 1) % events.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {events.map((_: Event, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? "w-8 bg-violet-500" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}