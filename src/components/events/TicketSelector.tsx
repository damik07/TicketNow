import React from "react";
import { Minus, Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock_available?: number;
  max_per_user?: number;
}

interface Quantities {
  [key: string]: number;
}

interface TicketSelectorProps {
  ticketTypes: TicketType[];
  quantities: Quantities;
  setQuantities: React.Dispatch<React.SetStateAction<Quantities>>;
}

export default function TicketSelector({ ticketTypes, quantities, setQuantities }: TicketSelectorProps) {
  const update = (id: string, delta: number, maxPerUser?: number) => {
    setQuantities((prev: Quantities) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      const limit = maxPerUser || 10;
      return { ...prev, [id]: Math.min(next, limit) };
    });
  };

  if (!ticketTypes?.length) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No hay entradas disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ticketTypes.map((tt: TicketType) => {
        const qty = quantities[tt.id] || 0;
        const soldOut = (tt.stock_available || 0) <= 0;
        const maxPerUser = tt.max_per_user || 10;
        const atLimit = qty >= maxPerUser;
        return (
          <div
            key={tt.id}
            className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
              qty > 0
                ? "bg-violet-500/5 border-violet-500/30"
                : "bg-slate-800/30 border-slate-700/50"
            } ${soldOut ? "opacity-50" : ""}`}
          >
            <div className="flex-1 mr-4">
              <h4 className="text-sm font-semibold text-white">{tt.name}</h4>
              {tt.description && <p className="text-xs text-slate-500 mt-0.5">{tt.description}</p>}
              <p className="text-lg font-bold text-violet-400 mt-1">
                ${tt.price?.toLocaleString("es-AR")}
              </p>
              <p className="text-xs text-slate-600">
                {soldOut ? "Agotado" : `${tt.stock_available || 0} disp. · máx. ${maxPerUser} por persona`}
              </p>
            </div>
            {!soldOut && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
                  onClick={() => update(tt.id, -1, maxPerUser)}
                  disabled={qty === 0}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-sm font-bold text-white w-6 text-center">{qty}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-8 w-8 rounded-lg border-slate-700 hover:bg-slate-700 ${atLimit ? "text-amber-400" : "text-slate-400 hover:text-white"}`}
                  onClick={() => update(tt.id, 1, maxPerUser)}
                  disabled={qty >= (tt.stock_available || 0) || atLimit}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}