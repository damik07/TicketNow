import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, QrCode, Wallet, ArrowRight, Info, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const isConsumptionType = (name: string | undefined) => {
  const n = name?.toLowerCase() || "";
  return n.includes("consumición") || n.includes("consumicion") || n.includes("consumo");
};

interface Ticket {
  id: string;
  event_title: string;
  event_date?: string;
  event_location: string;
  ticket_type_name: string;
  usage_status: string;
  qr_code: string;
  holder_name: string;
  event_id?: string;
  consumption_balance?: number;
}

interface TicketCardProps {
  ticket: Ticket;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const eventDate = ticket.event_date ? new Date(ticket.event_date) : null;
  const isUsed = ticket.usage_status === "ingresado";
  const isConsumption = isConsumptionType(ticket.ticket_type_name);

  // Solo para tickets de entrada (no consumición), buscar tipos de consumición del evento
  const { data: consumptionTypes = [] } = useQuery({
    queryKey: ["consumption-ticket-types", ticket.event_id],
    queryFn: async () => {
      // Simulación de tipos de consumición disponibles
      return [
        {
          id: "consumption1",
          name: "Consumición VIP",
          price: 5000,
          stock_total: 100,
          stock_available: 100
        },
        {
          id: "consumption2", 
          name: "Consumición Standard",
          price: 3000,
          stock_total: 200,
          stock_available: 200
        }
      ];
    },
    enabled: !isConsumption && !!ticket.event_id,
  });

  return (
    <div className={`relative bg-slate-900/50 border rounded-2xl overflow-hidden transition-all ${
      isUsed ? "border-slate-800/30 opacity-60" : "border-slate-800/50 hover:border-violet-500/30"
    }`}>
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{ticket.event_title}</h3>
            <Badge className={`mt-2 ${
              isUsed
                ? "bg-slate-700 text-slate-400 border-slate-600"
                : "bg-violet-500/20 text-violet-300 border-violet-500/30"
            } border text-xs`}>
              {ticket.ticket_type_name}
            </Badge>
          </div>
          <Badge className={`text-xs ${
            isUsed ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-green-500/10 text-green-400 border-green-500/30"
          } border`}>
            {isUsed ? "Usado" : "Válido"}
          </Badge>
        </div>

        <div className="space-y-2 mb-5">
          {eventDate && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{format(eventDate, "EEEE d 'de' MMMM, HH:mm", { locale: es })} hs</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span>{ticket.event_location}</span>
          </div>
        </div>

        {/* QR Code Area */}
        <div className="bg-white rounded-xl p-4 flex flex-col items-center">
          <QrCode className="w-24 h-24 text-slate-900 mb-2" />
          <p className="text-xs font-mono text-slate-600 tracking-wider">{ticket.qr_code}</p>
        </div>

        {/* Botón para comprar consumición desde ticket de entrada */}
        {!isConsumption && consumptionTypes.length > 0 && (
          <div className="mt-4 bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 space-y-2">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-violet-400" />
              Este evento tiene tickets de consumición disponibles
            </p>
            <div className="space-y-1.5">
              {consumptionTypes.map((ct) => {
                const item = encodeURIComponent(JSON.stringify([{
                  ticket_type_id: ct.id,
                  ticket_type_name: ct.name,
                  quantity: 1,
                  unit_price: ct.price,
                  subtotal: ct.price,
                }]));
                const url = createPageUrl(`Checkout?event_id=${ticket.event_id}&items=${item}&total=${ct.price}`);
                return (
                  <Link key={ct.id} to={url}>
                    <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-500 border-0 gap-2 text-xs h-8">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Comprar {ct.name} — ${ct.price.toLocaleString("es-AR")}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Consumption balance info + link to MisConsumiciones */}
        {isConsumption && (
          <div className="mt-4 space-y-2">
            <div className="bg-slate-800/50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-violet-400" />
                <div>
                  <p className="text-xs text-slate-400">Saldo disponible</p>
                  <p className="text-sm font-bold text-violet-400">
                    ${(ticket.consumption_balance ?? 0).toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
              <Link to={createPageUrl("MisConsumiciones")}>
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-500 border-0 gap-1.5 text-xs h-8"
                >
                  Gestionar saldo <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            {/* Disclaimer */}
            <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
              <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Al cargar saldo autorizás su uso hasta la finalización del evento. 
                El saldo no consumido se devuelve al CBU registrado en{" "}
                <Link to={createPageUrl("MisCuentas")} className="text-violet-400 underline underline-offset-2">
                  Mis Cuentas
                </Link>.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
          <p className="text-xs text-slate-500">Titular: {ticket.holder_name}</p>
          <p className="text-xs text-slate-600 font-mono">#{ticket.id?.slice(-6)}</p>
        </div>
      </div>


    </div>
  );
}