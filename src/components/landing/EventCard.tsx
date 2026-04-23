import React from "react";
import Link from "next/link";
import { createPageUrl } from "@/utils";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Category = "musica" | "deportes" | "teatro" | "conferencia" | "festival" | "fiesta" | "gastronomia" | "otro";

const CATEGORY_LABELS: Record<Category, string> = {
  musica: "Música",
  deportes: "Deportes",
  teatro: "Teatro",
  conferencia: "Conferencia",
  festival: "Festival",
  fiesta: "Fiesta",
  gastronomia: "Gastronomía",
  otro: "Otro"
};

const CATEGORY_COLORS: Record<Category, string> = {
  musica: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  deportes: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  teatro: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  conferencia: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  festival: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  fiesta: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
  gastronomia: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  otro: "bg-slate-500/20 text-slate-300 border-slate-500/30"
};

interface Event {
  id: string;
  title: string;
  date_time?: string;
  location_name: string;
  category?: Category;
  banner_url?: string;
  min_price?: number;
}

interface EventCardProps {
  event: Event;
  index?: number;
}

export default function EventCard({ event, index = 0 }: EventCardProps) {
  const eventDate = event.date_time ? new Date(event.date_time) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link href={createPageUrl(`EventDetail?id=${event.id}`)}>
        <div className="group relative bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden hover:border-violet-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/5">
          {/* Image */}
          <div className="relative aspect-[16/10] overflow-hidden">
            <img
              src={event.banner_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80"}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
            
            {/* Date badge */}
            {eventDate && (
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-sm border border-slate-700/50 rounded-xl px-3 py-2 text-center min-w-[56px]">
                <p className="text-xs font-bold text-violet-400 uppercase">
                  {format(eventDate, "MMM", { locale: es })}
                </p>
                <p className="text-lg font-bold text-white leading-none">
                  {format(eventDate, "dd")}
                </p>
              </div>
            )}

            {/* Category */}
            {event.category && (
              <div className="absolute top-3 right-3">
                <Badge className={`${event.category ? CATEGORY_COLORS[event.category] : CATEGORY_COLORS.otro} border text-[10px] font-medium`}>
                  {event.category ? CATEGORY_LABELS[event.category] : event.category}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="text-lg font-semibold text-white mb-3 line-clamp-1 group-hover:text-violet-300 transition-colors">
              {event.title}
            </h3>

            <div className="space-y-2 mb-4">
              {eventDate && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{format(eventDate, "EEEE d 'de' MMMM, HH:mm", { locale: es })} hs</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{event.location_name}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
              {event.min_price != null ? (
                <div>
                  <span className="text-xs text-slate-500">Desde</span>
                  <p className="text-lg font-bold text-white">
                    ${event.min_price.toLocaleString("es-AR")}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-400">Precio a confirmar</p>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-violet-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <Ticket className="w-4 h-4" />
                Comprar
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}