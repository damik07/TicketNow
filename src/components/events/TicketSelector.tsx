import React from "react";
import { Minus, Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock_available?: number;
  max_per_user?: number; // Límite por tipo de ticket (ej: 3)
}

interface Quantities {
  [key: string]: number;
}

interface TicketSelectorProps {
  ticketTypes: TicketType[];
  quantities: Quantities;
  setQuantities: (quantities: Quantities | ((prev: Quantities) => Quantities)) => void;
  maxAllowedItems: number; // Límite remanente global del Evento (ej: 4)
}

export default function TicketSelector({ 
  ticketTypes, 
  quantities, 
  setQuantities,
  maxAllowedItems 
}: TicketSelectorProps) {

  // Calculamos el total que el usuario metió en el carrito actual entre todas las entradas
  const currentTotalInCart = Object.values(quantities).reduce((a, b) => a + b, 0);

  const update = (id: string, delta: number, maxPerTicketType: number) => {
    setQuantities((prev: Quantities) => {
      const current = prev[id] || 0;
      
      if (delta < 0) {
        return { ...prev, [id]: Math.max(0, current - 1) };
      }

      // 🛡️ CONTROL GLOBAL: Si ya alcanzó el límite remanente del evento, no suma nada
      if (currentTotalInCart >= maxAllowedItems) {
        return prev;
      }

      // 🛡️ CONTROL INDIVIDUAL: Si ya alcanzó el límite de ESTE tipo de ticket específico, no suma
      if (current >= maxPerTicketType) {
        return prev;
      }

      return { ...prev, [id]: current + 1 };
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
        
        // El límite de este tipo de entrada en particular (vuelto número seguro)
        const maxPerTicketType = Number(tt.max_per_user || 10);
        
        // 💡 LÓGICA DE BLOQUEO PREDICTIVA DE DOBLE ESCUDO:
        // El botón "+" se congela si:
        // 1. Se agota el stock físico.
        // 2. El usuario ya alcanzó el máximo permitido para este tipo de ticket específico (ej: ya sumó 3 generales).
        // 3. O si al intentar sumar una entrada más de cualquier tipo, se pasa del remanente global del evento.
        const isPlusDisabled = 
          qty >= (tt.stock_available || 0) || 
          qty >= maxPerTicketType || 
          (currentTotalInCart + 1) > maxAllowedItems;

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
                {soldOut ? "Agotado" : `${tt.stock_available || 0} disp. · máx. ${maxPerTicketType} por tipo`}
              </p>
            </div>
            
            {!soldOut && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
                  onClick={() => update(tt.id, -1, maxPerTicketType)}
                  disabled={qty === 0}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                
                <span className="text-sm font-bold text-white w-6 text-center">{qty}</span>
                
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-8 w-8 rounded-lg border-slate-700 hover:bg-slate-700 ${
                    isPlusDisabled ? "text-slate-600" : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => update(tt.id, 1, maxPerTicketType)}
                  disabled={isPlusDisabled}
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