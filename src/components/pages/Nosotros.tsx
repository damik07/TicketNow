"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, Shield, Users, Globe } from "lucide-react";

interface Value {
  icon: React.ElementType;
  title: string;
  desc: string;
}

const VALUES: Value[] = [
  { icon: Zap, title: "Velocidad", desc: "Comprá tus entradas en segundos con la tecnología más rápida del mercado." },
  { icon: Shield, title: "Seguridad", desc: "Cada entrada cuenta con un QR único y verificación antifraude." },
  { icon: Users, title: "Comunidad", desc: "Conectamos organizadores con miles de asistentes apasionados." },
  { icon: Globe, title: "Alcance", desc: "Eventos en todo el país, desde pequeños shows hasta grandes festivales." },
];

export default function Nosotros() {
  return (
    <div className="bg-slate-950 min-h-screen">
      {/* Hero */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1920&q=80"
            className="w-full h-full object-cover opacity-20"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 to-slate-950" />
        </div>
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[150px]" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Transformamos la forma de{" "}
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                vivir eventos
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Somos una plataforma tecnológica que conecta organizadores de eventos con su público.
              Simplificamos la venta de entradas y ofrecemos herramientas poderosas para gestionar eventos de cualquier escala.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 hover:border-violet-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                <v.icon className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{v.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-4xl mx-auto px-4 pb-24 text-center">
        <h2 className="text-3xl font-bold text-white mb-6">Nuestra Misión</h2>
        <p className="text-slate-400 text-lg leading-relaxed">
          Democratizar el acceso a los mejores eventos y empoderar a los organizadores con tecnología de punta.
          Creamos que cada evento merezca una plataforma que esté a la altura de la experiencia que ofrece.
        </p>
      </section>
    </div>
  );
}
