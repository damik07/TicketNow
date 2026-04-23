import React from "react";
import { Music, Trophy, Drama, Mic, PartyPopper, UtensilsCrossed, Sparkles, LayoutGrid } from "lucide-react";

const CATEGORIES = [
  { key: "all", label: "Todos", icon: LayoutGrid },
  { key: "musica", label: "Música", icon: Music },
  { key: "deportes", label: "Deportes", icon: Trophy },
  { key: "teatro", label: "Teatro", icon: Drama },
  { key: "conferencia", label: "Conferencias", icon: Mic },
  { key: "festival", label: "Festivales", icon: Sparkles },
  { key: "fiesta", label: "Fiestas", icon: PartyPopper },
  { key: "gastronomia", label: "Gastronomía", icon: UtensilsCrossed },
];

interface CategoryFilterProps {
  selected: string;
  onChange: (category: string) => void;
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = selected === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              isActive
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}