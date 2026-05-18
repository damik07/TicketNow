"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, ShieldCheck, CreditCard, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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
}

interface CheckoutItem {
  ticket_type_id: string;
  ticket_type_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

function generateQR() {
  return "QR-" + Math.random().toString(36).substr(2, 12).toUpperCase();
}

export default function Checkout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const eventId = searchParams.get("event_id");
  const itemsStr = searchParams.get("items");
  const total = parseFloat(searchParams.get("total") || "0");
  const items: CheckoutItem[] = itemsStr ? JSON.parse(decodeURIComponent(itemsStr)) : [];

  const [user, setUser] = useState<User | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [holderName, setHolderName] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Get current session
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.error) {
          router.push('/Login');
          return;
        }

        setUser(data.user);
        setHolderName(data.user.full_name || "");

        // Get event data
        const eventResponse = await fetch(`/api/events?eventId=${eventId}`);
        const eventData = await eventResponse.json();
        
        if (eventData.error || !eventData.length) {
          router.push('/');
          return;
        }

        setEvent(eventData[0]);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load user data:', error);
        setLoading(false);
      }
    };
    
    if (eventId) {
      loadUser();
    }
  }, [eventId, router]);

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

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          items: orderItems,
          paymentMethod: 'simulado',
        }),
      });

      const payload = await orderResponse.json();

      if (!orderResponse.ok || payload.error) {
        throw new Error(payload.error || 'Error al crear la orden');
      }

      setProcessing(false);
      setSuccess(true);
      toast.success("¡Compra realizada con éxito!");
    } catch (error) {
      setProcessing(false);
      toast.error("Error al procesar la compra");
      console.error('Purchase error:', error);
    }
  };

  const navigateToPage = (page: string) => {
    router.push(`/${page}`);
  };

  const navigateToEventDetail = () => {
    router.push(`/EventDetail?id=${eventId}`);
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
            onClick={() => navigateToPage("MisEntradas")}
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
          onClick={navigateToEventDetail}
          className="text-slate-400 hover:text-white mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al evento
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Resumen de compra</h2>

              {event && (
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800">
                  <img
                    src={event.banner_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80"}
                    alt={event.title}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-white">{event.title}</h3>
                    <p className="text-xs text-slate-500">{event.location_name}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-white">{item.ticket_type_name}</p>
                      <p className="text-xs text-slate-500">x{item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-white">${item.subtotal?.toLocaleString("es-AR")}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-800 mt-5 pt-5 flex justify-between items-center">
                <span className="text-lg font-bold text-white">Total</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  ${total.toLocaleString("es-AR")}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Payment */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-violet-400" />
                Pago
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Titular</Label>
                  <Input
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 mb-5 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-400">Pago seguro simulado. En producción se integra con Mercado Pago.</p>
              </div>

              <Button
                onClick={handlePurchase}
                disabled={processing || !holderName}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg shadow-violet-500/25"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  `Pagar $${total.toLocaleString("es-AR")}` 
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
