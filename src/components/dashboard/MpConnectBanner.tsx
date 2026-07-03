"use client";

import React, { useState } from "react";
import { CreditCard, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MpConnectBannerProps {
  organizerId: string;
  mercadopagoUserId?: string | null;
  onRefreshOrganizer: () => void;
}

export default function MpConnectBanner({ 
  organizerId, 
  mercadopagoUserId, 
  onRefreshOrganizer 
}: MpConnectBannerProps) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Pedimos al backend la URL de autorización oficial de Mercado Pago armada
      const response = await fetch(`/api/organizers/mp-auth-url?organizerId=${organizerId}`);
      const data = await response.json();
      
      if (data.url) {
        // Redirigimos a Mercado Pago para que el organizador autorice la app
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No se pudo generar la URL de vinculación.");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al conectar con Mercado Pago");
      setConnecting(false);
    }
  };

  if (mercadopagoUserId) {
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Pasarela de Pagos Activa</h3>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 border text-[10px] py-0 px-1.5 font-normal">
                Conectado
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Los splits automáticos de comisiones para **TicketNow** están configurados correctamente. ID: {mercadopagoUserId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex items-start gap-3 max-w-xl">
        <div className="p-2 bg-amber-500/10 rounded-xl shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Vinculación requerida con Mercado Pago</h3>
          <p className="text-xs text-slate-400 leading-relaxed mt-1">
            Para poder recibir de forma automática los ingresos de tus ventas netas directo en tu billetera al instante del checkout, necesitás vincular tu cuenta.
          </p>
        </div>
      </div>
      <Button
        onClick={handleConnect}
        disabled={connecting}
        className="bg-[#009EE3] hover:bg-[#0087C4] text-white font-medium text-xs px-4 h-9 gap-2 transition-colors shrink-0"
      >
        {connecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4" />
        )}
        Conectar Mercado Pago
      </Button>
    </div>
  );
}