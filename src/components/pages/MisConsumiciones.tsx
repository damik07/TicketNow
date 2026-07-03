"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet, Check, X, AlertCircle, CreditCard } from "lucide-react";
import ConsumptionCard from "@/components/consumptions/ConsumptionCard";
import CargarSaldoModal from "@/components/consumptions/CargarSaldoModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  usage_status: "no_usado" | "parcial" | "consumido" | "esperando_confirmacion";
  consumption_balance: number; 
  consumption_initial: number; 
  pendingDeduction?: number | null;
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

  const [selectedTicket, setSelectedTicket] = useState<Ticket | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const [pendingCharge, setPendingCharge] = useState<{ ticketId: string; amount: number; eventTitle: string } | null>(null);
  const [respondingToCharge, setRespondingToCharge] = useState(false);

  // 1. Carga inicial de datos
  const loadData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (data.error) {
        router.push('/Login');
        return;
      }

      setUser(data.user);

      const [ticketsResponse, transactionsResponse] = await Promise.all([
        fetch(`/api/tickets?userId=${data.user.id}`),
        fetch(`/api/consumptions?userId=${data.user.id}`)
      ]);

      const ticketsData = await ticketsResponse.json();
      const transactionsData = await transactionsResponse.json();

      const consumptionTickets = ticketsData.filter((t: Ticket) =>
        t.ticket_type_name.toLowerCase().includes('consumición') ||
        t.ticket_type_name.toLowerCase().includes('consumicion') ||
        t.ticket_type_name.toLowerCase().includes('consumo')
      );

      setTickets(consumptionTickets);
      setTransactions(transactionsData || []);

      const activePrompt = consumptionTickets.find((t: Ticket) => t.usage_status === "esperando_confirmacion");
      if (activePrompt && activePrompt.pendingDeduction) {
        setPendingCharge({
          ticketId: activePrompt.id,
          amount: activePrompt.pendingDeduction,
          eventTitle: activePrompt.event_title
        });
      }
    } catch (error) {
      console.error('Failed to load consumption data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  // 2. 🔄 POLLING DE SEGURIDAD
  useEffect(() => {
    if (!user || respondingToCharge) return;

    const checkLiveStatus = async () => {
      try {
        const res = await fetch(`/api/tickets?userId=${user.id}`);
        if (!res.ok) return;
        const freshTickets = await res.json();

        const livePrompt = freshTickets.find((t: any) => t.usage_status === "esperando_confirmacion");

        if (livePrompt && livePrompt.pendingDeduction) {
          if (!pendingCharge || pendingCharge.ticketId !== livePrompt.id) {
            setPendingCharge({
              ticketId: livePrompt.id,
              amount: livePrompt.pendingDeduction,
              eventTitle: livePrompt.event_title
            });
          }
        } else {
          setPendingCharge(null);
        }
      } catch (err) {
        console.error("Error en el polling de consumiciones:", err);
      }
    };

    const interval = setInterval(checkLiveStatus, 3500);
    return () => clearInterval(interval);
  }, [user, pendingCharge, respondingToCharge]);

  // 🧠 CÁLCULO DILIGENTE DEL DÉFICIT EN LOCAL
  const ticketAsociado = tickets.find(t => t.id === pendingCharge?.ticketId);
  const saldoDisponible = ticketAsociado?.consumption_balance || 0;
  const montoDebito = pendingCharge?.amount || 0;
  const tieneSaldoSuficiente = saldoDisponible >= montoDebito;
  const diferenciaDéficit = montoDebito - saldoDisponible;

  // 3. Acción de Aprobación o Rechazo por parte del Cliente
  const handleConfirmOrReject = async (action: "approve" | "reject") => {
    if (!pendingCharge) return;
    setRespondingToCharge(true);

    try {
      // Si va a aprobar pero no le alcanza, disparamos la creación de preferencia MP
      if (action === "approve" && !tieneSaldoSuficiente) {
        const mpRes = await fetch("/api/checkout/preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId: pendingCharge.ticketId,
            monto: diferenciaDéficit,
            esDiferenciaConsumo: true
          })
        });

        const mpData = await mpRes.json();
        if (!mpRes.ok) throw new Error(mpData.error || "Error al generar link de MercadoPago");

        toast.info("Redirigiendo a MercadoPago para abonar la diferencia...");
        // Redirige al flujo de checkout de MercadoPago
        if (mpData.init_point) {
          router.push(mpData.init_point);
        }
        return;
      }

      // Flujo normal directo (Aprobación con saldo o Rechazo)
      const res = await fetch("/api/tickets/confirm-consumption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: pendingCharge.ticketId, action })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Ocurrió un problema al procesar tu respuesta.");
      } else {
        if (action === "approve") {
          toast.success("¡Consumo autorizado con éxito!");
        } else {
          toast.info("Cobro cancelado.");
        }
        setPendingCharge(null);
        await loadData();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de conexión con el servidor.");
    } finally {
      setRespondingToCharge(false);
    }
  };

  const transactionsByTicket = transactions.reduce((acc: any, tx: any) => {
    if (!acc[tx.ticket_id]) acc[tx.ticket_id] = [];
    acc[tx.ticket_id].push(tx);
    return acc;
  }, {} as Record<string, ConsumptionTransaction[]>);

  const handleCargarSaldoSuccess = () => {
    loadData();
    toast.success("Saldo actualizado correctamente");
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
                  ticket={ticket as any}
                  transactions={transactionsByTicket[ticket.id] || []}
                  onCargarSaldo={() => setSelectedTicket(ticket)}
                />
              ))}
            </div>

            <CargarSaldoModal
              ticket={selectedTicket as Ticket}
              open={!!selectedTicket}
              onClose={() => setSelectedTicket(undefined)}
              onSuccess={handleCargarSaldoSuccess}
            />
          </>
        )}
      </div>

      {/* 🚨 MODAL EMERGENTE INTERACTIVO CON DETECCIÓN DE DÉFICIT 🚨 */}
      {pendingCharge && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full text-center space-y-5 shadow-2xl shadow-violet-500/10">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
              tieneSaldoSuficiente ? "bg-violet-500/10 text-violet-400" : "bg-blue-500/10 text-blue-400"
            }`}>
              {tieneSaldoSuficiente ? (
                <AlertCircle className="w-6 h-6 animate-bounce" />
              ) : (
                <CreditCard className="w-6 h-6 text-blue-400" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Confirmación de Barra</h3>
              <p className="text-xs text-slate-400 px-2 line-clamp-1">Evento: {pendingCharge.eventTitle}</p>
            </div>

            {/* Desglose Inteligente de Saldos */}
            <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl space-y-2 text-left">
              <div className="flex justify-between text-xs text-slate-500 font-medium uppercase">
                <span>Monto solicitado:</span>
                <span className="text-white">${montoDebito.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-medium uppercase">
                <span>Tu saldo actual:</span>
                <span className="text-white">${saldoDisponible.toLocaleString("es-AR")}</span>
              </div>
              
              {!tieneSaldoSuficiente && (
                <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-blue-400 font-bold uppercase">
                  <span>Diferencia a pagar:</span>
                  <span>${diferenciaDéficit.toLocaleString("es-AR")}</span>
                </div>
              )}
            </div>

            {!tieneSaldoSuficiente ? (
              <p className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg text-left">
                💡 Tu saldo no es suficiente. Al presionar el botón pagarás los <strong>${diferenciaDéficit.toLocaleString("es-AR")}</strong> restantes usando MercadoPago de forma inmediata.
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Verificá el monto antes de aceptar. Tenés 60 segundos antes de que expire la solicitud.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                onClick={() => handleConfirmOrReject("reject")}
                disabled={respondingToCharge}
                variant="outline"
                className="border-slate-800 text-slate-300 hover:bg-slate-800 gap-2 h-11 rounded-xl"
              >
                <X className="w-4 h-4" />
                Rechazar
              </Button>
              
              <Button
                onClick={() => handleConfirmOrReject("approve")}
                disabled={respondingToCharge}
                className={`gap-2 h-11 rounded-xl font-semibold shadow-lg ${
                  tieneSaldoSuficiente 
                    ? "bg-violet-600 hover:bg-violet-500 shadow-violet-600/20 text-white border-0" 
                    : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 text-white border-0"
                }`}
              >
                {respondingToCharge ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : tieneSaldoSuficiente ? (
                  <>
                    <Check className="w-4 h-4" />
                    Autorizar
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pagar MP
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}