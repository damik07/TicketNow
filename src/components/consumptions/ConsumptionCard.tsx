import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Wallet, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Ticket {
  id: string;
  event_title: string;
  ticket_type_name: string;
  event_date: string;
  consumption_initial?: number;
  consumption_balance: number;
  usage_status: 'no_usado' | 'parcial' | 'consumido';
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  createdAt: string;
}

interface ConsumptionCardProps {
  ticket: Ticket;
  transactions?: Transaction[];
  onCargarSaldo: (ticket: Ticket) => void;
}

export default function ConsumptionCard({ ticket, transactions = [], onCargarSaldo }: ConsumptionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const initial = ticket.consumption_initial ?? ticket.consumption_balance ?? 0;
  const balance = ticket.consumption_balance ?? 0;
  const consumed = Math.max(0, initial - balance);
  const pct = initial > 0 ? Math.round((consumed / initial) * 100) : 0;

  const statusLabel = {
    no_usado: { label: "Sin usar", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
    parcial: { label: "Con saldo", color: "bg-violet-500/10 text-violet-400 border-violet-500/30" },
    consumido: { label: "Agotado", color: "bg-red-500/10 text-red-400 border-red-500/30" },
  };
  const status = statusLabel[ticket.usage_status] || statusLabel["no_usado"];

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">{ticket.event_title}</p>
            <h3 className="text-white font-semibold">{ticket.ticket_type_name}</h3>
          </div>
          <Badge variant="outline" className={`border text-xs ${status.color}`}>{status.label}</Badge>
        </div>

        {/* Balance summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-800/40 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Carga inicial</p>
            <p className="text-sm font-bold text-green-400">${initial.toLocaleString("es-AR")}</p>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Consumido</p>
            <p className="text-sm font-bold text-red-400">${consumed.toLocaleString("es-AR")}</p>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Saldo</p>
            <p className="text-sm font-bold text-violet-400">${balance.toLocaleString("es-AR")}</p>
          </div>
        </div>

        {/* Load balance button */}
        <Button onClick={() => onCargarSaldo(ticket)} variant="outline" size="sm"
          className="w-full mb-4 border-violet-500/40 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 gap-2">
          <Plus className="w-4 h-4" /> Cargar saldo
        </Button>

        {/* Progress bar */}
        <div className="mb-1">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Consumido</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Toggle transactions */}
      {transactions.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-3 border-t border-slate-800/50 text-sm text-slate-400 hover:text-white hover:bg-slate-800/20 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Historial de movimientos ({transactions.length})
            </span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2.5 border-b border-slate-800/40 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          tx.type === "credito"
                            ? "bg-green-500/10"
                            : "bg-red-500/10"
                        }`}>
                          {tx.type === "credito"
                            ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                            : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                          }
                        </div>
                        <div>
                          <p className="text-sm text-white">{tx.description}</p>
                          <p className="text-xs text-slate-500">
                            {tx.createdAt
                              ? format(new Date(tx.createdAt), "dd MMM yyyy HH:mm", { locale: es })
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${tx.type === "credito" ? "text-green-400" : "text-red-400"}`}>
                          {tx.type === "credito" ? "+" : "-"}${tx.amount.toLocaleString("es-AR")}
                        </p>
                        <p className="text-xs text-slate-500">Saldo: ${tx.balance_after?.toLocaleString("es-AR")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}