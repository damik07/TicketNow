"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TicketCard from "@/components/tickets/TicketCard";
import { Loader2, Ticket, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Ticket {
  id: string;
  ticket_type_id: string;
  event_id: string;
  user_id: string;
  event_title: string;
  event_date: string;
  event_location: string;
  ticket_type_name: string;
  qr_code: string;
  usage_status: string;
  holder_name: string;
  holder_email: string;
  consumption_balance?: number;
  consumption_initial?: number;
  created_date: string;
}

export default function MisEntradas() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "valid" | "used">("all");

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current session
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.error) {
          router.push('/login');
          return;
        }

        setUser(data.user);

        // Get user's tickets
        const ticketsResponse = await fetch(`/api/tickets?userId=${data.user.id}`);
        const ticketsData = await ticketsResponse.json();

        setTickets(ticketsData || []);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load tickets:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [router]);

  const filtered = filter === "all" ? tickets : tickets.filter((t: Ticket) =>
    filter === "valid" ? t.usage_status === "no_usado" : t.usage_status === "ingresado"
  );

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Mis Entradas</h1>
            <p className="text-slate-500 mt-1">{tickets.length} entrada{tickets.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            {[
              { key: "all", label: "Todas" },
              { key: "valid", label: "Válidas" },
              { key: "used", label: "Usadas" },
            ].map((f) => (
              <Button
                key={f.key}
                variant={filter === f.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.key as "all" | "valid" | "used")}
                className={filter === f.key
                  ? "bg-violet-600 hover:bg-violet-500 border-0"
                  : "border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
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
          <div className="text-center py-20">
            <Ticket className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No tenés entradas todavía</p>
            <p className="text-slate-600 text-sm mt-1">Explorá los eventos disponibles y comprá tus entradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
