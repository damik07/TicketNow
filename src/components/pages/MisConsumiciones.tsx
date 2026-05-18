"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
import ConsumptionCard from "@/components/consumptions/ConsumptionCard";
import CargarSaldoModal from "@/components/consumptions/CargarSaldoModal";

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Ticket {
  id: string;
  ticket_type_name: string;
  user_id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_location: string;
  qr_code: string;
  usage_status: string;
  consumption_balance?: number;
  consumption_initial?: number;
}

interface ConsumptionTransaction {
  id: string;
  ticket_id: string;
  user_id: string;
  event_id: string;
  event_title: string;
  ticket_type_name: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_date: string;
}

export default function MisConsumiciones() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [transactions, setTransactions] = useState<ConsumptionTransaction[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current session
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.error) {
          router.push('/Login');
          return;
        }

        setUser(data.user);

        // Get user's tickets and transactions
        const [ticketsResponse, transactionsResponse] = await Promise.all([
          fetch(`/api/tickets?userId=${data.user.id}`),
          fetch(`/api/consumptions?userId=${data.user.id}`)
        ]);

        const ticketsData = await ticketsResponse.json();
        const transactionsData = await transactionsResponse.json();

        // Filter only consumption tickets
        const consumptionTickets = ticketsData.filter((t: Ticket) => 
          t.ticket_type_name.toLowerCase().includes('consumición') ||
          t.ticket_type_name.toLowerCase().includes('consumicion') ||
          t.ticket_type_name.toLowerCase().includes('consumo')
        );

        setTickets(consumptionTickets);
        setTransactions(transactionsData || []);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load consumption data:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [router]);

  // Group transactions by ticket
  const transactionsByTicket = transactions.reduce((acc: any, tx: any) => {
    if (!acc[tx.ticket_id]) acc[tx.ticket_id] = [];
    acc[tx.ticket_id].push(tx);
    return acc;
  }, {} as Record<string, ConsumptionTransaction[]>);

  const handleCargarSaldoSuccess = () => {
    // TODO: Implement Next.js data refresh
    console.log("Saldo cargado exitosamente");
    // In a real implementation, you would refresh the data here
  };

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wallet className="w-8 h-8 text-violet-400" />
            Mis Consumiciones
          </h1>
          <p className="text-slate-500 mt-2">Seguí tu saldo y movimientos en cada evento</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20">
            <Wallet className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No tenés consumiciones activas</p>
            <p className="text-slate-600 text-sm mt-1">
              Las consumiciones aparecen acá cuando comprás una entrada con saldo
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <ConsumptionCard
                  key={ticket.id}
                  ticket={ticket}
                  transactions={txByTicket[ticket.id] || []}
                  onCargarSaldo={() => setSelectedTicket(ticket)}
                />
              ))}
            </div>

            <CargarSaldoModal
              ticket={selectedTicket}
              open={!!selectedTicket}
              onClose={() => setSelectedTicket(null)}
              onSuccess={handleCargarSaldoSuccess}
            />
          </>
        )}
      </div>
    </div>
  );
}
