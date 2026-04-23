"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function Contacto() {
  const [form, setForm] = useState<ContactForm>({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Por favor, completa los campos requeridos");
      return;
    }
    
    setSending(true);
    
    try {
      // TODO: Implement Next.js API call for contact message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate API call
      console.log("Contact form submitted:", form);
      
      setSending(false);
      setSent(true);
      toast.success("Mensaje enviado correctamente");
    } catch (error) {
      setSending(false);
      toast.error("Error al enviar el mensaje");
    }
  };

  if (sent) {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">¡Mensaje enviado!</h2>
          <p className="text-slate-400 mb-6">Te responderemos a la brevedad. Gracias por comunicarte con nosotros.</p>
          <Button 
            onClick={() => { 
              setSent(false); 
              setForm({ name: "", email: "", subject: "", message: "" }); 
            }}
            variant="outline" 
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Enviar otro mensaje
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen py-24">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-violet-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Contacto</h1>
          <p className="text-slate-400">¿Tenés alguna consulta? Escribinos y te respondemos lo antes posible.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 sm:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label className="text-slate-300 text-sm mb-2 block">Nombre</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tu nombre"
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-sm mb-2 block">Email</Label>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tu@email.com"
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-sm mb-2 block">Asunto</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="¿En qué podemos ayudarte?"
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm mb-2 block">Mensaje</Label>
              <Textarea
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Contanos tu consulta..."
                rows={5}
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 resize-none"
              />
            </div>
            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg shadow-violet-500/25 h-12"
            >
              {sending ? (
                <span className="flex items-center gap-2">Enviando...</span>
              ) : (
                <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Enviar Mensaje</span>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
