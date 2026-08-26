"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MpConnectBannerProps {
  organizerId: string;
  mercadopagoUserId?: string | null;
  onRefreshOrganizer: () => void | Promise<void>;
}

export default function MpConnectBanner({ 
  organizerId, 
  mercadopagoUserId, 
  onRefreshOrganizer 
}: MpConnectBannerProps) {
  const [connecting, setConnecting] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Guardamos una referencia para no ejecutar el handler múltiples veces en modo estricto
  const processedRef = useRef(false);

  useEffect(() => {
    const mpSuccess = searchParams.get("mp_success");
    const mpError = searchParams.get("mp_error");

    if ((mpSuccess || mpError) && !processedRef.current) {
      processedRef.current = true;

      if (mpSuccess === "true") {
        // 1. Pedir actualización de datos a la API de Neon inmediatamente
        onRefreshOrganizer();

        // 2. Dar un pequeño delay para que la UI no colisione con el replace de la URL
        setTimeout(() => {
          toast.success("¡Mercado Pago conectado exitosamente!");

          // 3. Limpiar parámetros de la URL
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("mp_success");
          router.replace(currentUrl.pathname + currentUrl.search);
        }, 100);

      } else if (mpError) {
        const errorMessages: Record<string, string> = {
          missing_params: "Faltan parámetros en la autorización de Mercado Pago.",
          token_exchange_failed: "Error al intercambiar credenciales con Mercado Pago.",
          server_configuration_error: "Error de configuración de servidor en Mercado Pago.",
          internal_error: "Ocurrió un error inesperado durante la vinculación.",
        };

        setTimeout(() => {
          toast.error(errorMessages[mpError] || "No se pudo completar la vinculación.");

          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("mp_error");
          router.replace(currentUrl.pathname + currentUrl.search);
        }, 100);
      }
    }
  }, [searchParams, router, onRefreshOrganizer]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch(`/api/organizers/mp-auth-url?organizerId=${organizerId}`);
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No se pudo generar la URL de vinculación.");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al conectar con Mercado Pago");
      setConnecting(false);
    }
  };

  // Verificamos ambas formas de nombrado por seguridad
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