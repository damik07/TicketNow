import React from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  onSearch: () => void;
}

export default function HeroSection({ searchQuery, setSearchQuery, onSearch }: HeroSectionProps) {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1920&q=80"
          alt="Concert"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/70 to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-purple-600/10" />
      </div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-violet-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">Eventos en vivo ahora</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            <span className="text-white">Viví la mejor</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              experiencia
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-xl leading-relaxed">
            Descubrí los eventos más increíbles, comprá tus entradas en segundos y
            disfrutá de una experiencia única.
          </p>

          {/* Search Bar */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2 max-w-2xl">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Buscar eventos, artistas, lugares..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSearch()}
                  className="pl-11 h-12 bg-white/5 border-0 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-violet-500/50 rounded-xl"
                />
              </div>
              <Button
                onClick={onSearch}
                className="h-12 px-8 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 rounded-xl shadow-lg shadow-violet-500/25 font-medium"
              >
                Buscar
              </Button>
            </div>
          </div>


        </motion.div>
      </div>
    </section>
  );
}