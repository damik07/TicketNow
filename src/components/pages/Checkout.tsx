// src/components/pages/Checkout.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, ShieldCheck, CreditCard, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { orderLineBuyerUnitPrice, packCommissionSliceFromPack, roundMoney } from "@/lib/pack-commission";

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Event {
  id: string;
  title: string;
  location_name: string;
  date_time: string;
  banner_url?: string;
  maxTicketsPerUser?: number;
  type?: string;
  category?: string;
  pack?: any;
}

interface CheckoutItem {
  ticket_type_id: string;
  ticket_type_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// Función auxiliar para formatear segundos a MM:SS
function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event_id");

  const [items, setItems] = useState<CheckoutItem[]>([]);
  // 🔑 Guardamos el tiempo restante en segundos reales
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [holderName, setHolderName] = useState("");

  useEffect(() => {
    const loadUserAndCheckoutData = async () => {
      try {
        if (!eventId) return;

        let localItems: CheckoutItem[] = [];

        if (typeof window !== "undefined" && window.sessionStorage) {
          const savedItems = window.sessionStorage.getItem(`checkout_items_${eventId}`);
          if (savedItems) {
            localItems = JSON.parse(savedItems);
            setItems(localItems);
          } else {
            router.push('/');
            return;
          }
        }

        const response = await fetch(`/api/auth/me?eventId=${eventId}`);
        const data = await response.json();

        if (data.error) {
          router.push('/Login');
          return;
        }

        setUser(data.user);
        setHolderName(data.user.full_name || "");

        const eventResponse = await fetch(`/api/events?eventId=${eventId}`);
        const eventData = await eventResponse.json();

        if (eventData.error || !eventData.length) {
          router.push('/');
          return;
        }

        const currentEvent = eventData[0];
        setEvent(currentEvent);

        const ticketsInCart = localItems.reduce((sum, item) => sum + item.quantity, 0);
        const pastTickets = data.ticketsBought || 0;
        const totalTicketsCombined = ticketsInCart + pastTickets;

        if (currentEvent.maxTicketsPerUser && totalTicketsCombined > currentEvent.maxTicketsPerUser) {
          toast.error(`Acceso denegado: Ya tenés ${pastTickets} entradas aprobadas y sumar ${ticketsInCart} más supera el límite de ${currentEvent.maxTicketsPerUser} por persona.`);
          router.push(`/EventDetail?id=${eventId}`);
          return;
        }

        const rawToken = window.sessionStorage.getItem(`queue_token_${eventId}`);
        if (!rawToken) {
          toast.error('No tenés un turno de compra activo.');
          router.push(`/EventDetail?id=${eventId}`);
          return;
        }

        const res = await fetch(`/api/queue/status?token=${encodeURIComponent(rawToken)}&eventId=${eventId}`);
        const queueData = await res.json();

        console.log('🔍 [QUEUE DEBUG CLIENT]:', {
          responseRemainingSeconds: queueData?.remainingSeconds,
          responseExpiresAt: queueData?.expiresAt,
          clientNowISO: new Date().toISOString(),
          clientNowMs: Date.now(),
        });

        if (queueData.status === 'expired' || queueData.status === 'completed') {
          toast.error('Tu turno de compra expiró o ya fue usado.');
          window.sessionStorage.removeItem(`queue_token_${eventId}`);
          router.push(`/EventDetail?id=${eventId}`);
          return;
        }

        console.log('🚨 [QUEUE STATUS RECEIVED]:', queueData);
        
        if (queueData.status !== 'admitted') {
          toast.error('Aún no es tu turno. Te redirigimos a la sala de espera.');
          router.push(`/SalaEspera?event_id=${eventId}&checkout_url=${encodeURIComponent(`/Checkout?event_id=${eventId}`)}`);
          return;
        }

        // 🔑 ASIGNACIÓN DE SEGUNDOS: Damos prioridad estricta a remainingSeconds del Servidor
        if (typeof queueData.remainingSeconds === 'number') {
          setSecondsLeft(queueData.remainingSeconds);
        } else if (queueData.expiresAt) {
          const fallbackSeconds = Math.max(0, Math.floor((new Date(queueData.expiresAt).getTime() - Date.now()) / 1000));
          setSecondsLeft(fallbackSeconds);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to load user data:', error);
        setLoading(false);
      }
    };

    if (eventId) {
      loadUserAndCheckoutData();
    }
  }, [eventId, router]);

  // 🔑 INTERVALO DE CONTEO REGRESIVO BASADO EN SEGUNDOS
  useEffect(() => {
    if (secondsLeft === null) return;

    if (secondsLeft <= 0) {
      toast.error('Tu tiempo ha expirado.');
      if (eventId) {
        window.sessionStorage.removeItem(`queue_token_${eventId}`);
      }
      window.location.href = `/EventDetail?id=${eventId}`;
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, eventId]);

  const packSlice = event?.pack ? packCommissionSliceFromPack(event.pack) : null;

  const finalItems = items.map((item) => {
    const finalUnitPrice = packSlice
      ? orderLineBuyerUnitPrice(item.unit_price, item.ticket_type_name, packSlice)
      : item.unit_price;

    const serviceChargePerUnit = finalUnitPrice - item.unit_price;

    return {
      ...item,
      finalUnitPrice,
      finalSubtotal: roundMoney(finalUnitPrice * item.quantity),
      serviceCharge: roundMoney(serviceChargePerUnit * item.quantity)
    };
  });

  const baseTotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const finalTotalAmount = finalItems.reduce((sum, item) => sum + item.finalSubtotal, 0);
  const totalServiceCharge = finalItems.reduce((sum, item) => sum + item.serviceCharge, 0);

  const handlePurchase = async () => {
    if (!user || !event) {
      toast.error("Error: datos de usuario o evento no disponibles");
      return;
    }

    setProcessing(true);

    try {
      const orderItems = items.map((item) => ({
        ticketTypeId: item.ticket_type_id,
        ticketTypeName: item.ticket_type_name,
        quantity: item.quantity,
      }));

      const isSimulated = process.env.NEXT_PUBLIC_PAYMENT_SIMULATED === 'true';

      const sessionToken = typeof window !== 'undefined'
        ? window.sessionStorage.getItem(`queue_token_${eventId}`)
        : null;

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          items: orderItems,
          sessionToken,
          paymentMethod: isSimulated ? 'simulado' : 'mercadopago',
        }),
      });

      const payload = await orderResponse.json();

      if (!orderResponse.ok || payload.error) {
        throw new Error(payload.error || 'Error al crear la orden');
      }

      if (isSimulated) {
        const simulateResponse = await fetch('/api/checkout/simulate-success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: payload.id }),
        });

        const simulatePayload = await simulateResponse.json();

        if (!simulateResponse.ok || simulatePayload.error) {
          throw new Error(simulatePayload.error || 'Error al procesar la simulación de pago');
        }

        if (typeof window !== 'undefined' && eventId) {
          window.sessionStorage.removeItem(`queue_token_${eventId}`);
          window.sessionStorage.removeItem(`checkout_items_${eventId}`);
          window.sessionStorage.removeItem(`checkout_total_${eventId}`);
        }

        setProcessing(false);
        setSuccess(true);
        toast.success("¡Compra simulada con éxito y entradas enviadas por mail!");
      } else {
        // MP recomienda init_point (prod) con usuarios test del vendedor; sandbox_init_point solo si lo activás explícitamente.
        const redirectUrl = payload.initPoint || payload.sandboxInitPoint;

        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          throw new Error("No se pudo obtener la pasarela de Mercado Pago");
        }
      }
    } catch (error: any) {
      setProcessing(false);
      toast.error(error.message || "Error al procesar la compra");
      console.error('Purchase error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">¡Compra exitosa!</h2>
          <p className="text-slate-400 mb-8">Tus entradas están listas. Podés verlas en "Mis Entradas".</p>
          <Button
            onClick={() => router.push("/MisEntradas")}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg shadow-violet-500/25 px-8"
          >
            Ver Mis Entradas
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-3xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/EventDetail?id=${eventId}`)}
          className="text-slate-400 hover:text-white mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al evento
        </Button>

        {secondsLeft !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl mb-6 flex justify-between items-center text-sm backdrop-blur-sm"
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-medium">Completá tu compra antes de que expire tu reserva:</span>
            </div>
            <span className="font-mono font-bold bg-amber-500/20 px-3 py-1 rounded-xl text-base text-amber-300 shadow-inner">
              {formatSeconds(secondsLeft)}
            </span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Resumen de compra</h2>

              {event && (
                <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-800">
                  <img
                    src={event.banner_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80"}
                    alt={event.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{event.title}</h3>
                    <p className="text-xs text-slate-500 mb-1">{event.location_name}</p>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {event.type && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-md">
                          {event.type}
                        </span>
                      )}
                      {event.category && (
                        <span className="inline-flex items-center text-[10px] capitalize font-medium bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-md">
                          {event.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {finalItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-white font-medium">{item.ticket_type_name}</p>
                      <p className="text-xs text-slate-500">x{item.quantity} (${item.unit_price.toLocaleString("es-AR")} c/u)</p>
                    </div>
                    <p className="text-sm font-medium text-white">${(item.unit_price * item.quantity).toLocaleString("es-AR")}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-800 mt-5 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal entradas</span>
                  <span className="text-slate-300">${baseTotal.toLocaleString("es-AR")}</span>
                </div>

                {totalServiceCharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-violet-400 flex items-center gap-1">
                      Costo de servicio <span className="text-[10px] bg-violet-500/10 px-1.5 py-0.5 rounded text-violet-300">TicketNow</span>
                    </span>
                    <span className="text-violet-400">+ ${totalServiceCharge.toLocaleString("es-AR")}</span>
                  </div>
                )}

                {event?.pack && event.pack.isAbsorbed && (
                  <div className="flex justify-between text-xs text-green-400 bg-green-500/5 p-2 rounded-xl border border-green-500/10">
                    <span>Costo de servicio bonificado</span>
                    <span>$0</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 mt-4 pt-4 flex justify-between items-center">
                <span className="text-lg font-bold text-white">Total a pagar</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  ${finalTotalAmount.toLocaleString("es-AR")}
                </span>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-violet-400" />
                Pago
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Titular de la compra</Label>
                  <Input
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 mb-5 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-400">
                  {process.env.NEXT_PUBLIC_PAYMENT_SIMULATED === 'true'
                    ? "Entorno de pruebas activo (Pago Simulado)."
                    : "Serás redirigido de forma segura a Mercado Pago."}
                </p>
              </div>

              <Button
                onClick={handlePurchase}
                disabled={processing || !holderName}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg shadow-violet-500/25 text-base font-semibold"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  `Pagar $${finalTotalAmount.toLocaleString("es-AR")}`
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}