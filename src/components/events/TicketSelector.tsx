import React from "react";
import { Minus, Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock_available?: number;
  max_per_user?: number; // Límite específico de este tipo de ticket (ej: 3)
}

interface Quantities {
  [key: string]: number;
}

interface TicketSelectorProps {
  ticketTypes: TicketType[];
  quantities: Quantities;
  setQuantities: (quantities: Quantities | ((prev: Quantities) => Quantities)) => void;
  maxAllowedItems: number; // Límite remanente global del Evento por usuario (ej: 4)
}

export default function TicketSelector({ 
  ticketTypes, 
  quantities, 
  setQuantities,
  maxAllowedItems 
}: TicketSelectorProps) {

  // Calculamos la suma actual de entradas en el carrito
  const currentTotalInCart = Object.values(quantities).reduce((a, b) => a + b, 0);

  const update = (id: string, delta: number, maxPerTicketType: number, stockAvailable: number) => {
    setQuantities((prev: Quantities) => {
      const currentQty = prev[id] || 0;
      
      // Restar entradas siempre está permitido si la cantidad es mayor a 0
      if (delta < 0) {
        return { ...prev, [id]: Math.max(0, currentQty - 1) };
      }

      // Calculamos el total exacto en el carrito dentro de la transacción de estado
      const totalInCart = Object.values(prev).reduce((a, b) => a + b, 0);

      // 🛡️ CONTROL 1: Límite global del Evento por usuario
      if (totalInCart >= maxAllowedItems) {
        return prev;
      }

      // 🛡️ CONTROL 2: Límite individual de este Tipo de Ticket
      if (currentQty >= maxPerTicketType) {
        return prev;
      }

      // 🛡️ CONTROL 3: Stock físico disponible
      if (currentQty >= stockAvailable) {
        return prev;
      }

      return { ...prev, [id]: currentQty + 1 };
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
        const stockAvailable = tt.stock_available ?? 0;
        const soldOut = stockAvailable <= 0;
        
        // 💡 Límite por tipo de ticket individual (si no está definido en el objeto, usa el remanente global)
        const maxPerTicketType = Number(tt.max_per_user ?? maxAllowedItems);
        
        // 💡 CONDICIÓN DE BLOQUEO DEL BOTÓN "+":
        // Se desactiva si alcanza cualquiera de los 3 techos: stock, tope del ticket o tope del evento
        const isPlusDisabled = 
          qty >= stockAvailable || 
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
                {soldOut 
                  ? "Agotado" 
                  : `${stockAvailable} disp. · máx. ${maxPerTicketType} por entrada`}
              </p>
            </div>
            
            {!soldOut && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
                  onClick={() => update(tt.id, -1, maxPerTicketType, stockAvailable)}
                  disabled={qty === 0}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                
                <span className="text-sm font-bold text-white w-6 text-center">{qty}</span>
                
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-8 w-8 rounded-lg border-slate-700 hover:bg-slate-700 ${
                    isPlusDisabled ? "text-slate-600 opacity-50 cursor-not-allowed" : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => update(tt.id, 1, maxPerTicketType, stockAvailable)}
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