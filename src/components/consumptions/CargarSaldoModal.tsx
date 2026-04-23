import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet, ShieldCheck, Plus } from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  consumption_balance: number;
  event_title: string;
  ticket_type_name: string;
}

interface CargarSaldoModalProps {
  ticket: Ticket;
  open: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function CargarSaldoModal({ ticket, open, onClose, onSuccess }: CargarSaldoModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCargar = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setLoading(true);

    const currentBalance = ticket.consumption_balance ?? 0;
    const newBalance = currentBalance + val;

    // Simulación de carga de saldo
    toast.success(`Saldo cargado: $${val.toLocaleString("es-AR")}. Nuevo saldo: $${newBalance.toLocaleString("es-AR")}`);
    setLoading(false);
    setAmount("");
    onSuccess(newBalance);
    onClose();
  };

  if (!ticket) return null;

  const currentBalance = ticket.consumption_balance ?? 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-violet-400" /> Cargar Saldo
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          <div className="bg-slate-800/40 rounded-xl p-4 space-y-1">
            <p className="text-xs text-slate-400">{ticket.event_title}</p>
            <p className="text-xs text-slate-500">{ticket.ticket_type_name}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-slate-400">Saldo actual</span>
              <span className="text-lg font-bold text-violet-400">${currentBalance.toLocaleString("es-AR")}</span>
            </div>
          </div>

          {/* Quick amounts */}
          <div>
            <Label className="text-slate-400 text-xs mb-2 block">Monto rápido</Label>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((q) => (
                <button key={q} onClick={() => setAmount(String(q))}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    amount === String(q)
                      ? "bg-violet-600 text-white border-violet-500"
                      : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-violet-500 hover:text-white"
                  }`}>
                  ${q.toLocaleString("es-AR")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-slate-400 text-xs mb-1.5 block">O ingresá un monto</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej: 3000" className="bg-slate-800/50 border-slate-700 text-white" min={1} />
          </div>

          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400">Pago simulado. En producción se integra con Mercado Pago.</p>
          </div>

          <Button onClick={handleCargar} disabled={loading || !amount || parseFloat(amount) <= 0}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 gap-2">
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Plus className="w-4 h-4" /> Cargar ${parseFloat(amount || "0").toLocaleString("es-AR")}</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}