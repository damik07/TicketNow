"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import {
  CheckCircle2, Loader2, FileText, ExternalLink, ShieldCheck,
  Zap, BarChart2, Users, Ticket
} from "lucide-react";
import { toast } from "sonner";
import { signIn } from 'next-auth/react';

const BENEFITS = [
  { icon: Ticket, title: "Venta ágiles", desc: "Creá eventos y vendé entradas sin demoras." },
  { icon: BarChart2, title: "Dashboard en tiempo real", desc: "Seguí tus ventas, ingresos y asistentes en vivo." },
  { icon: Users, title: "Gestión de Staff", desc: "Administrá tu equipo con roles y validación de QR." },
  { icon: ShieldCheck, title: "Pagos seguros", desc: "Integración con Mercado Pago y transferencia directa." },
];

const CONTRACT_TEXT = `CONTRATO DE ADHESIÓN — PLATAFORMA TICKETFLOW

Versión 1.0 — Febrero 2026

1. PARTES
El presente contrato se celebra entre TicketFlow S.A. (en adelante "LA PLATAFORMA") y el usuario que solicita el rol de Organizador de Eventos (en adelante "EL ORGANIZADOR").

2. OBJETO
EL ORGANIZADOR adhiere a los términos de uso de la plataforma para publicar, gestionar y comercializar eventos mediante la venta de entradas digitales.

3. OBLIGACIONES DEL ORGANIZADOR
a) Brindar información verídica sobre los eventos publicados (fecha, lugar, artistas, capacidad).
b) Garantizar la realización del evento en los términos anunciados.
c) En caso de cancelación, gestionar los reembolsos conforme a la política vigente.
d) No publicar contenido ilegal, discriminatorio o que infrinja derechos de terceros.
e) Cumplir con la legislación vigente en materia fiscal, habilitaciones y espectáculos públicos.

4. COMISIONES Y PAGOS
LA PLATAFORMA retendrá una comisión del 8% + IVA sobre cada transacción aprobada. Los fondos serán liquidados dentro de los 5 días hábiles posteriores al evento.

5. RESPONSABILIDAD
LA PLATAFORMA actúa como intermediario tecnológico. La responsabilidad sobre el evento, su organización y cumplimiento recae exclusivamente en EL ORGANIZADOR.

6. DATOS PERSONALES
EL ORGANIZADOR autoriza a LA PLATAFORMA a procesar sus datos personales conforme a la Ley 25.326 de Protección de Datos Personales de la República Argentina.

7. RESCISIÓN
Cualquiera de las partes podrá rescindir este contrato con 30 días de anticipación. LA PLATAFORMA podrá suspender la cuenta de forma inmediata ante incumplimientos graves.

8. JURISDICCIÓN
Las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires.

Al aceptar este contrato, EL ORGANIZADOR declara haber leído, comprendido y aceptado todos los términos aquí establecidos.`;

interface User {
  id: string;
  full_name: string;
}

export default function SerOrganizador() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [fiscalId, setFiscalId] = useState("");
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleContractChange = (checked: boolean | "indeterminate") => {
    setAcceptedContract(checked === true);
  };

  // Validación y formateo de CUIT
  const formatCUIT = (value: string) => {
    // Eliminar todo excepto números
    const numbers = value.replace(/\D/g, '');
    
    // Formato XX-XXXXXXXX-X (11 dígitos)
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 10) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 10)}-${numbers.slice(10, 11)}`;
    }
  };

  const validateCUIT = (cuit: string) => {
    const numbers = cuit.replace(/\D/g, '');
    return numbers.length === 11;
  };

  // Validación y formateo de teléfono argentino
  const formatPhone = (value: string) => {
    // Eliminar todo excepto números y el +
    let cleaned = value.replace(/[^\d+]/g, '');
    
    // Asegurar que comience con +54
    if (!cleaned.startsWith('+54')) {
      if (cleaned.startsWith('54')) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('0')) {
        cleaned = '+54' + cleaned.slice(1);
      } else if (cleaned.length > 0) {
        cleaned = '+54' + cleaned;
      }
    }
    
    // Formatear: +54 XXX XXX-XXXX
    const numbers = cleaned.replace(/\D/g, '').slice(2); // Eliminar +54
    
    if (numbers.length === 0) {
      return '+54';
    } else if (numbers.length <= 3) {
      return `+54 ${numbers}`;
    } else if (numbers.length <= 6) {
      return `+54 ${numbers.slice(0, 3)} ${numbers.slice(3)}`;
    } else {
      return `+54 ${numbers.slice(0, 3)} ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    }
  };

  const validatePhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    // +54 + código de área (2-4 dígitos) + número (6-8 dígitos)
    return numbers.length >= 10 && numbers.length <= 13;
  };

  const handleFiscalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCUIT(e.target.value);
    setFiscalId(formatted);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        // Get current session
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.error) {
          router.push('/Login');
          return;
        }

        setUser(data.user);

        // Check if user has organizer account
        const organizerResponse = await fetch(`/api/organizers?userId=${data.user.id}`);
        const organizersData = await organizerResponse.json();
        
        if (organizersData.error || !organizersData.length) {
          setIsOrganizer(false);
        } else {
          setIsOrganizer(true);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to load user data:', error);
        setLoading(false);
      }
    };
    
    load();
  }, [router]);

  const handleSubmit = async () => {
    if (!acceptedContract) {
      toast.error("Debés aceptar el contrato para continuar");
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Implement Next.js API call for organizer registration
      const response = await fetch('/api/organizers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          businessName,
          phone,
          fiscalId,
        }),
      });
      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
        setSubmitting(false);
        return;
      }
      
      setSubmitting(false);
      setSuccess(true);
      toast.success("¡Te registraste como organizador exitosamente!");
      
      // Forzar actualización completa de sesión
      try {
        // Mostrar mensaje al usuario
        toast.info("Actualizando tu sesión...");
        
        // Esperar un momento y forzar logout/login para reiniciar NextAuth
        setTimeout(async () => {
          // Forzar logout y login para reiniciar completamente la sesión
          await signOut({ callbackUrl: '/Login?redirect=DashboardVentas' });
        }, 1500);
      } catch (error) {
        console.error('Error updating session:', error);
        // Fallback: recargar página completamente
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      setSubmitting(false);
      toast.error("Error al registrar como organizador");
    }
  };

  const navigateToPage = (page: string) => {
    router.push(`/${page}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (success || isOrganizer) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            {success ? "¡Ya sos Organizador!" : "Ya tenés cuenta de Organizador"}
          </h2>
          <p className="text-slate-400 mb-8">
            {success
              ? "Tu solicitud fue procesada. Ahora podés crear y gestionar eventos."
              : "Tu cuenta ya tiene permisos de organizador. Podés crear eventos desde el Dashboard."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={() => navigateToPage("CrearEvento")}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg shadow-violet-500/25"
            >
              Crear mi primer evento
            </Button>
            <Button 
              onClick={() => navigateToPage("DashboardVentas")}
              variant="outline" 
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Ir al Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen py-24">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-6">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-medium text-violet-300">Para Organizadores</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Empezá a vender entradas{" "}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              hoy mismo
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Registrate como organizador, aceptá los términos y comenzá a crear eventos en minutos.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
                <b.icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{b.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Registration Form */}
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 sm:p-8"
          >
            <h2 className="text-xl font-bold text-white mb-6">Completá tu perfil de organizador</h2>

            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">Nombre comercial / Razón social *</Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Nombre de tu empresa o productora"
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">CUIT / Datos fiscales *</Label>
                <Input
                  value={fiscalId}
                  onChange={handleFiscalIdChange}
                  placeholder="20-12345678-9"
                  className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 ${
                    fiscalId && !validateCUIT(fiscalId) ? 'border-red-500' : ''
                  }`}
                  maxLength={13} // XX-XXXXXXXX-X
                />
                {fiscalId && !validateCUIT(fiscalId) && (
                  <p className="text-red-400 text-xs mt-1">Formato inválido. Ej: 20-12345678-9</p>
                )}
              </div>
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">Teléfono de contacto *</Label>
                <Input
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="+54 343 455-5678"
                  className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 ${
                    phone && !validatePhone(phone) ? 'border-red-500' : ''
                  }`}
                  maxLength={17} // +54 XXX XXX-XXXX
                />
                {phone && !validatePhone(phone) && (
                  <p className="text-red-400 text-xs mt-1">Formato inválido. Ej: +54 343 455-5678</p>
                )}
              </div>
            </div>

            {/* Contract Section */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium text-white">Contrato de Adhesión</span>
                </div>
                <button
                  onClick={() => setShowContract(!showContract)}
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {showContract ? "Ocultar" : "Leer contrato"}
                </button>
              </div>

              {showContract && (
                <div className="bg-slate-950/50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto border border-slate-700/30">
                  <pre className="text-xs text-slate-400 whitespace-pre-wrap font-sans leading-relaxed">
                    {CONTRACT_TEXT}
                  </pre>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Checkbox
                  id="contract"
                  checked={acceptedContract}
                  onCheckedChange={handleContractChange}
                  className="mt-0.5 border-slate-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                />
                <label htmlFor="contract" className="text-sm text-slate-300 leading-relaxed cursor-pointer">
                  He leído y acepto el{" "}
                  <button
                    onClick={() => setShowContract(true)}
                    className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
                  >
                    Contrato de Adhesión
                  </button>{" "}
                  y los{" "}
                  <button
                    onClick={() => setShowContract(true)}
                    className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
                  >
                    Términos y Condiciones
                  </button>{" "}
                  de TicketFlow para operar como Organizador de Eventos.
                </label>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !acceptedContract || !businessName || !fiscalId || !validateCUIT(fiscalId) || Boolean(phone && !validatePhone(phone))}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg shadow-violet-500/25 text-base font-medium disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Registrarme como Organizador"
              )}
            </Button>

            <p className="text-center text-xs text-slate-600 mt-4">
              ¿Ya tenés cuenta de comprador?{" "}
              <button 
                onClick={() => navigateToPage("")}
                className="text-slate-500 hover:text-slate-300"
              >
                Volver al inicio
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
