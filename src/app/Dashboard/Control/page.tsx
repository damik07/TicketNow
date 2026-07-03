"use client";

import React, { useState } from "react";
import QRScanner from "@/components/scanner/QRScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ScanQrCode, CheckCircle2, AlertTriangle, Beer, UserCheck } from "lucide-react";

export default function ControlDashboard() {
  const [showScanner, setShowScanner] = useState(false);
  const [amountToDeduct, setAmountToDeduct] = useState(""); // Para uso opcional en barra
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const handleQRScanned = async (qrData: string) => {
    setShowScanner(false);
    setProcessing(true);
    setScanResult(null);

    try {
      const res = await fetch("/api/scanner/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCode: qrData,
          amountToDeduct: amountToDeduct ? parseFloat(amountToDeduct) : undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setScanResult({ error: true, message: data.error, ...data });
        toast.error(data.error || "Código rechazado.");
      } else {
        setScanResult({ error: false, ...data });
        toast.success(data.message || "Procesado correctamente.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error crítico de conectividad.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Panel de Control & Staff</h1>
          <p className="text-sm text-slate-400 mt-1">Ingresos a puerta y débito de barra en tiempo real</p>
        </div>

        {/* Módulo opcional para ingresar precio del trago si es barra */}
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-2">
          <Label className="text-slate-400 text-xs">Monto a descontar (Solo para barras con precio variable)</Label>
          <Input
            type="number"
            placeholder="Ej: 3500 (Dejar vacío para el total de la consumición)"
            value={amountToDeduct}
            onChange={(e) => setAmountToDeduct(e.target.value)}
            className="bg-slate-950 border-slate-800 text-white"
          />
        </div>

        {/* Botón Central de Activación */}
        <Button
          onClick={() => setShowScanner(true)}
          disabled={processing}
          className="w-full h-16 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-bold text-lg gap-3 rounded-2xl shadow-xl shadow-violet-500/10"
        >
          <ScanQrCode className="w-6 h-6 animate-pulse" />
          {processing ? "Procesando código..." : "Abrir Cámara Escáner"}
        </Button>

        {/* FEEDBACK VISUAL INMEDIATO PARA EL STAFF */}
        {scanResult && (
          <div className={`border p-6 rounded-2xl transition-all ${
            scanResult.error 
              ? "bg-red-500/5 border-red-500/20" 
              : "bg-green-500/5 border-green-500/20"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {scanResult.error ? (
                <AlertTriangle className="w-8 h-8 text-red-400 shrink-0" />
              ) : scanResult.type === "entry" ? (
                <UserCheck className="w-8 h-8 text-green-400 shrink-0" />
              ) : (
                <Beer className="w-8 h-8 text-violet-400 shrink-0" />
              )}
              <div>
                <h3 className={`text-lg font-bold ${scanResult.error ? "text-red-400" : "text-green-400"}`}>
                  {scanResult.error ? "Lectura Denegada" : "Lectura Aprobada"}
                </h3>
                <p className="text-xs text-slate-400">{scanResult.message || scanResult.error}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm border-t border-slate-800/60 pt-4">
              {scanResult.holderName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Titular:</span>
                  <span className="font-semibold text-white">{scanResult.holderName}</span>
                </div>
              )}
              {scanResult.ticketTypeName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipo:</span>
                  <span className="text-slate-300">{scanResult.ticketTypeName}</span>
                </div>
              )}
              {scanResult.deductedAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Debitado:</span>
                  <span className="text-violet-400 font-bold">${scanResult.deductedAmount.toLocaleString("es-AR")}</span>
                </div>
              )}
              {scanResult.remainingBalance !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo Remanente:</span>
                  <span className="text-green-400 font-bold">${scanResult.remainingBalance.toLocaleString("es-AR")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Renderizado del Scanner pantalla completa */}
        {showScanner && (
          <QRScanner
            onScan={handleQRScanned}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </div>
  );
}