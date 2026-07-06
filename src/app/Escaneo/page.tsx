"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Loader2, Camera, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import QRScanner from "@/components/scanner/QRScanner";

export default function EscaneoPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [qrInput, setQrInput] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [validating, setValidating] = useState(false);
  const [consumptionAmount, setConsumptionAmount] = useState("");

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!isAuthenticated || !user) {
        router.push('/Login');
        return;
      }

      // Validamos que sea un rol operativo o de gestión habilitado
      if (!['ADMIN', 'ORGANIZER', 'STAFF'].includes(user.role)) {
        toast.error("No tienes permisos para acceder a la terminal de escaneo.");
        router.push('/');
        return;
      }
    }
  }, [isAuthenticated, user, isLoadingAuth, router]);

  const handleScanQR = async (code?: string) => {
    const qrCode = code || qrInput.trim();
    if (!qrCode) return;
    
    setValidating(true);
    setShowCamera(false);

    try {
      const response = await fetch("/api/scanner/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qrCode,
          amountToDeduct: consumptionAmount ? parseFloat(consumptionAmount) : undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al procesar el código QR");
      }

      if (result.type === "entry") {
        toast.success(`✓ Ingreso AUTORIZADO: ${result.holderName}`);
      } else if (result.type === "consumption_requested") {
        toast.info(
          `⏳ Cobro enviado ($${parseFloat(consumptionAmount).toLocaleString("es-AR")}). Esperando confirmación...`, 
          { duration: 6000 }
        );
        setConsumptionAmount("");
      }

      setQrInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al validar el código QR");
    } finally {
      setValidating(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-24 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <QrCode className="w-6 h-6 text-violet-400" /> Terminal de Control
          </h1>
          <p className="text-slate-500 text-sm mt-1">Escanear ingresos y cobrar consumiciones</p>
        </div>

        <div className="bg-slate-900/50 border border-violet-500/20 rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-slate-400 text-xs">Código de Entrada / QR</Label>
            <div className="flex gap-2">
              <Input
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScanQR()}
                placeholder="Escanear o tipear código..."
                className="bg-slate-800/50 border-slate-700 text-white flex-1"
                autoFocus
                disabled={validating}
              />
              <Button 
                onClick={() => setShowCamera(true)} 
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
              >
                <Camera className="w-4 h-4" /> Cámara
              </Button>
            </div>
          </div>
          
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <Label className="text-slate-400 text-xs">Monto a Cobrar Consumición</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="number"
                value={consumptionAmount}
                onChange={(e) => setConsumptionAmount(e.target.value)}
                placeholder="0.00"
                className="bg-slate-800/50 border-slate-700 text-white pl-9"
              />
            </div>
            <p className="text-[11px] text-slate-500 italic">Dejar vacío si solo vas a validar acceso en puerta.</p>
          </div>

          <Button 
            onClick={() => handleScanQR()} 
            disabled={validating || (!qrInput && !showCamera)}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 text-white font-medium py-6 rounded-xl"
          >
            {validating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Procesar Operación"}
          </Button>
        </div>

        {showCamera && (
          <QRScanner 
            onScan={handleScanQR}
            onClose={() => setShowCamera(false)}
          />
        )}
      </div>
    </div>
  );
}