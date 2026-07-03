"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TicketCard from "@/components/tickets/TicketCard";
import { Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface TicketType {
  id: string;
  ticketTypeId: string;
  eventId: string;
  userId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  ticketTypeName: string;
  qrCode: string;
  usageStatus: string; // 'no_usado' | 'ingresado'
  holderName: string;
  holderEmail: string;
  consumptionBalance?: number;
  consumptionInitial?: number;
  created_date: string;
  // 🔑 Agregamos el estado de pago que vendrá cruzado desde la Order
  paymentStatus?: "pendiente" | "paid" | "pendiente de pago" | string;
}

type FilterType = "all" | "valid" | "used" | "pending";

export default function MisEntradas() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("valid"); // 💡 Cambiado por defecto a 'valid' para mostrar lo útil de entrada

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (data.error) {
          router.push('/Login');
          return;
        }

        setUser(data.user);

        const ticketsResponse = await fetch(`/api/tickets?userId=${data.user.id}`);
        const ticketsData = await ticketsResponse.json();

        // Aseguramos normalizar las propiedades si vienen con camelCase u orden correlativo
        const normalizedTickets = (ticketsData || []).map((t: any) => {
          // Extraemos el estado nativo de la orden o del ticket
          const rawStatus = t.order?.paymentStatus || t.paymentStatus || "";

          // Normalizamos a un estándar unificado (ej: "paid") para que el frontend no se confunda
          let finalStatus = "pendiente";

          if (["aprobado", "approved", "paid", "pagado"].includes(rawStatus.toLowerCase())) {
            finalStatus = "paid";
          } else if (["cancelado", "cancelled", "rejected", "rechazado"].includes(rawStatus.toLowerCase())) {
            finalStatus = "cancelado";
          }

          return {
            ...t,
            paymentStatus: finalStatus // 👈 Ahora siempre va a valer "paid", "pendiente" o "cancelado"
          };
        });

        setTickets(normalizedTickets);

        

        setLoading(false);
      } catch (error) {
        console.error('Failed to load tickets:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  // 🔑 LÓGICA DE FILTRADO REPARADA Y ROBUSTA
  const filtered = tickets.filter((t: TicketType) => {
    // Pasamos todo a minúsculas para evitar errores de tipeo o de base de datos
    const status = (t.paymentStatus || "").toLowerCase();
    const usage = (t.usageStatus || "").toLowerCase();

    // Consideramos exitoso si es "paid" o si quedó con el "approved" de Mercado Pago
    const isPaid = status === "paid" || status === "approved" || status === "pagado";
    const isPending = status === "pendiente" || status === "pendiente de pago" || status === "pending";

    // 1. Filtro de Pendientes
    if (filter === "pending") {
      return isPending;
    }

    // 2. Filtro de Válidas (Pagas y sin usar)
    if (filter === "valid") {
      return isPaid && (usage === "no_usado" || usage === "no_used");
    }

    // 3. Filtro de Usadas (Pagas e ingresadas al evento)
    if (filter === "used") {
      return isPaid && (usage === "ingresado" || usage === "used");
    }

    // 'all' -> Muestra todas las que no estén explícitamente canceladas o rechazadas
    return status !== "cancelado" && status !== "cancelled" && status !== "rejected";
  });

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Mis Entradas</h1>
            <p className="text-slate-500 mt-1">
              {filtered.length} entrada{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* 🔑 BARRA DE FILTROS EXPANDIDA */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "Todas" },
              { key: "valid", label: "Válidas" },
              { key: "pending", label: "Pendientes" },
              { key: "used", label: "Usadas" },
            ].map((f) => (
              <Button
                key={f.key}
                variant={filter === f.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.key as FilterType)}
                className={filter === f.key
                  ? "bg-violet-600 hover:bg-violet-500 border-0 text-white"
                  : "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900"
                }
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
            <Ticket className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">
              {filter === "pending" ? "No tenés pagos pendientes" : "No tenés entradas aquí"}
            </p>
            <p className="text-slate-600 text-sm mt-1">
              {filter === "pending"
                ? "¡Buenísimo! Todas tus órdenes cargadas están procesadas correctamente."
                : "Explorá los eventos disponibles y adquirí tus accesos."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                // Le pasamos una propiedad opcional al Card por si adentro querés ocultar el QR si está pendiente
                isPending={ticket.paymentStatus === "pendiente" || ticket.paymentStatus === "pendiente de pago"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}