import React from "react";
import { Calendar } from "lucide-react";

interface DateFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClearFilters: () => void;
}

export default function DateFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
}: DateFilterProps) {
  return (
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 flex flex-wrap items-center gap-4 mb-6">
      <div className="flex items-center gap-2 text-slate-400">
        <Calendar className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-medium text-slate-300">Filtrar por período:</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500 font-medium uppercase">Desde</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 cursor-pointer scheme-dark"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500 font-medium uppercase">Hasta</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 cursor-pointer scheme-dark"
        />
      </div>

      {(startDate || endDate) && (
        <button
          onClick={onClearFilters}
          className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors ml-auto bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-xl border border-violet-500/20"
        >
          Limpiar Filtros
        </button>
      )}
    </div>
  );
}