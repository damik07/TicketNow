"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FAQ {
  q: string;
  a: string;
  cat: string;
}

interface FAQItemProps {
  faq: FAQ;
  isOpen: boolean;
  toggle: () => void;
}

const FAQS: FAQ[] = [
  { q: "¿Cómo compro mis entradas?", a: "Seleccioná el evento, elegí el tipo y cantidad de entradas, y completá el pago con tarjeta de crédito/débito o Mercado Pago. Recibirás tus entradas digitales con código QR al instante.", cat: "compras" },
  { q: "¿Cómo accedo al evento con mi entrada?", a: "Al llegar al evento, simplemente mostrá el código QR de tu entrada desde la sección 'Mis Entradas'. El personal de staff escaneará el código para validar tu ingreso.", cat: "qr" },
  { q: "¿Puedo solicitar un reembolso?", a: "Los reembolsos están sujetos a la política de cada organizador. Si el evento es cancelado, el reembolso es automático. Para otros casos, contactanos desde la sección de Soporte.", cat: "reembolsos" },
  { q: "¿Mis entradas son transferibles?", a: "Sí, podés transferir tus entradas a otra persona. Cada entrada tiene un código QR único que se puede compartir. El titular del QR es quien ingresa al evento.", cat: "compras" },
  { q: "¿Qué métodos de pago aceptan?", a: "Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), Mercado Pago, y transferencia bancaria.", cat: "compras" },
  { q: "¿Cómo creo un evento como organizador?", a: "Registrate en la plataforma y solicitá el rol de Productor. Una vez aprobado, podrás crear eventos desde el panel de organizador, configurar tipos de entradas, precios y gestionar las ventas en tiempo real.", cat: "organizadores" },
  { q: "¿Qué pasa si pierdo mi código QR?", a: "No te preocupes, tus entradas siempre están disponibles en la sección 'Mis Entradas' de tu cuenta. Solo necesitás iniciar sesión para acceder a ellas.", cat: "qr" },
  { q: "¿Hay límite de entradas por persona?", a: "Cada organizador define el límite de entradas por compra. Generalmente podés comprar hasta 10 entradas por transacción.", cat: "compras" },
];

function FAQItem({ faq, isOpen, toggle }: FAQItemProps) {
  return (
    <div className="border border-slate-800/50 rounded-xl overflow-hidden hover:border-slate-700/50 transition-colors">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-slate-950 min-h-screen py-24">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Preguntas Frecuentes</h1>
          <p className="text-slate-400 mb-8">Encontrá respuestas a las dudas más comunes</p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar pregunta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isOpen={openIndex === i}
              toggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-slate-500 py-10">No se encontraron resultados</p>
          )}
        </div>
      </div>
    </div>
  );
}
