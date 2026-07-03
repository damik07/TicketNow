"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Wallet, ArrowRight, Info, ShoppingCart, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { createPageUrl } from "@/utils";
import { displayLocalDate } from "@/utils/date";
import { QRCodeSVG } from "qrcode.react";

const isConsumptionType = (name: string | undefined) => {
  const n = name?.toLowerCase() || "";
  return n.includes("consumición") || n.includes("consumicion") || n.includes("consumo");
};

interface Ticket {
  id: string;
  eventTitle: string;
  eventDate?: string;
  eventLocation: string;
  ticketTypeName: string;
  usageStatus: string;
  qrCode: string;
  holderName: string;
  eventId?: string;
  consumptionBalance?: number;
}

// 🔑 Agregamos la propiedad isPending a las Props del componente
interface TicketCardProps {
  ticket: Ticket;
  isPending?: boolean; 
}

export default function TicketCard({ ticket, isPending = false }: TicketCardProps) {
  const eventDate = ticket.eventDate ? displayLocalDate(ticket.eventDate) : null;
  const isUsed = ticket.usageStatus === "ingresado";
  const isConsumption = isConsumptionType(ticket.ticketTypeName);

  const { data: consumptionTypes = [] } = useQuery({
    queryKey: ["consumption-ticket-types", ticket.eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${ticket.eventId}/consumption-types`);
      if (!response.ok) {
        throw new Error("Error al recuperar las consumiciones");
      }
      return response.json();
    },
    // Si el pago está pendiente, tampoco hace falta cargar consumiciones disponibles
    enabled: !isConsumption && !!ticket.eventId && !isPending,
  });

  return (
    <div className={`relative bg-slate-900/50 border rounded-2xl overflow-hidden transition-all ${
      isPending 
        ? "border-amber-500/20" 
        : isUsed 
          ? "border-slate-800/30 opacity-60" 
          : "border-slate-800/50 hover:border-violet-500/30"
    }`}>
      {/* Top accent dinámico */}
      <div className={`h-1 bg-gradient-to-r ${
        isPending 
          ? "from-amber-500 to-orange-500" 
          : "from-violet-500 to-purple-500"
      }`} />

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{ticket.eventTitle}</h3>
            <Badge className={`mt-2 ${
              isPending
                ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                : isUsed
                  ? "bg-slate-700 text-slate-400 border-slate-600"
                  : "bg-violet-500/20 text-violet-300 border-violet-500/30"
            } border text-xs`}>
              {ticket.ticketTypeName}
            </Badge>
          </div>
          
          {/* Badge de estado general superior derecho */}
          <Badge className={`text-xs ${
            isPending 
              ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
              : isUsed 
                ? "bg-red-500/10 text-red-400 border-red-500/30" 
                : "bg-green-500/10 text-green-400 border-green-500/30"
          } border`}>
            {isPending ? "Pago Pendiente" : isUsed ? "Usado" : "Válido"}
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
            <span>{ticket.eventLocation}</span>
          </div>
        </div>

        {/* 🔑 AREA DEL CÓDIGO QR CON RENDERIZADO CONDICIONAL POR PAGO */}
        {isPending ? (
          <div className="border border-amber-500/20 rounded-xl p-6 bg-amber-500/5 flex flex-col items-center justify-center text-center">
            <Clock className="w-8 h-8 text-amber-400 animate-pulse mb-2" />
            <p className="text-sm font-semibold text-amber-300">Esperando confirmación del pago</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              El código de ingreso se habilitará automáticamente una vez acreditado el pago en Mercado Pago.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center">
            {ticket.qrCode ? (
              <div className="p-2 bg-white rounded-lg">
                <QRCodeSVG
                  value={ticket.qrCode}
                  size={110}
                  bgColor="#FFFFFF"
                  fgColor="#0f172a"
                  level="M"
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-slate-100 animate-pulse flex items-center justify-center rounded-lg text-slate-400 text-xs text-center p-2">
                Sin código
              </div>
            )}
            <p className="text-xs font-mono text-slate-600 tracking-wider mt-3">{ticket.qrCode}</p>
          </div>
        )}

        {/* Botón para comprar consumición desde ticket de entrada (Se oculta si está pendiente) */}
        {!isConsumption && consumptionTypes.length > 0 && !isPending && (
          <div className="mt-4 bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 space-y-2">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-violet-400" />
              Este evento tiene tickets de consumición disponibles
            </p>
            <div className="space-y-1.5">
              {consumptionTypes.map((ct: any) => {
                const item = encodeURIComponent(JSON.stringify([{
                  ticket_type_id: ct.id,
                  ticket_type_name: ct.name,
                  quantity: 1,
                  unit_price: ct.price,
                  subtotal: ct.price,
                }]));
                const url = createPageUrl(`Checkout?eventId=${ticket.eventId}&items=${item}&total=${ct.price}`);
                return (
                  <Link key={ct.id} href={url}>
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

        {/* Módulo de saldos de Consumiciones */}
        {isConsumption && (
          <div className="mt-4 space-y-2">
            <div className="bg-slate-800/50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-violet-400" />
                <div>
                  <p className="text-xs text-slate-400">Saldo disponible</p>
                  <p className="text-sm font-bold text-violet-400">
                    ${(ticket.consumptionBalance ?? 0).toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
              <Link href={createPageUrl("MisConsumiciones")}>
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-500 border-0 gap-1.5 text-xs h-8"
                >
                  Gestionar saldo <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
              <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Al cargar saldo autorizás su uso hasta la finalización del evento.
                El saldo no consumido se devuelve al CBU registrado en{" "}
                <Link href={createPageUrl("MisCuentas")} className="text-violet-400 underline underline-offset-2">
                  Mis Cuentas
                </Link>.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
          <p className="text-xs text-slate-500">Titular: {ticket.holderName}</p>
          <p className="text-xs text-slate-600 font-mono">#{ticket.id?.slice(-6)}</p>
        </div>
      </div>
    </div>
  );
}