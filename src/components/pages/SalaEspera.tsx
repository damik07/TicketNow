"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Users, Clock, ChevronRight, Music, Volume2, VolumeX, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Playlist de videos de YouTube (música de ambiente/electrónica - embeds públicos)
const PLAYLIST = [
  { id: "jfKfPfyJRdk", title: "Lo-fi Hip Hop Radio", artist: "Lofi Girl" },
  { id: "5qap5aO4i9A", title: "Lofi Chill Beats", artist: "ChilledCow" },
  { id: "rUxyKA_-grg", title: "Jazz Cafe Radio", artist: "Cafe Music BGM" },
  { id: "kgx4WGK0oNU", title: "Deep House Music", artist: "NoCopyrightSounds" },
  { id: "36YnV9STBqc", title: "Relaxing Piano Music", artist: "BRIGHT" },
];

const QUEUE_THRESHOLD = 3; // Usuarios concurrentes para activar la fila
const ADMIT_BATCH = 2;     // Cuántos admitir por ciclo
const ADMIT_INTERVAL = 15000; // ms entre cada admisión (15 seg)
const SESSION_EXPIRE = 10 * 60 * 1000; // 10 min para completar la compra

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface QueueEntry {
  id: string;
  event_id: string;
  user_id: string;
  session_token: string;
  position: number;
  status: "waiting" | "admitted" | "expired";
  admitted_at?: string;
  expires_at?: string;
}

interface Track {
  id: string;
  title: string;
  artist: string;
}

function generateSessionToken() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function SalaEspera() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const eventId = searchParams.get("event_id");
  const checkoutUrl = searchParams.get("checkout_url") ? decodeURIComponent(searchParams.get("checkout_url")!) : null;

  const [user, setUser] = useState<User | null>(null);
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [admitted, setAdmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const sessionToken = useRef<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar y redirigir al checkout
  const proceedToCheckout = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  }, [checkoutUrl]);

  // Inicializar sesión y registro en fila
  useEffect(() => {
    // TODO: Implement Next.js authentication check
    const init = async () => {
      const timer = setTimeout(() => {
        // Mock user data
        const mockUser: User = {
          id: "1",
          full_name: "Usuario Test",
          email: "usuario@test.com"
        };
        setUser(mockUser);

        // Generar token único de sesión (anti-duplicados)
        const storedToken = typeof window !== 'undefined' && window.sessionStorage 
          ? window.sessionStorage.getItem(`queue_token_${eventId}`)
          : null;
        const token = storedToken || generateSessionToken();
        if (sessionToken) sessionToken.current = token;
        if (typeof window !== 'undefined' && window.sessionStorage && !storedToken) {
          window.sessionStorage.setItem(`queue_token_${eventId}`, token);
        }

        // Simular queue entry
        const mockQueueEntry: QueueEntry = {
          id: "1",
          event_id: eventId!,
          user_id: mockUser.id,
          session_token: token,
          position: Math.floor(Math.random() * 10) + 1,
          status: "waiting"
        };

        setQueueEntry(mockQueueEntry);
        setLoading(false);
        startPolling(mockUser.id, token);
      }, 1000);
      
      return () => clearTimeout(timer);
    };
    
    init();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [eventId]);

  const startPolling = (userId: string, token: string) => {
    pollRef.current = setInterval(async () => {
      // TODO: Implement Next.js API calls for queue status
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Simular actualización de estado
      const shouldAdmit = Math.random() > 0.7; // 30% chance de ser admitido
      
      if (shouldAdmit) {
        setAdmitted(true);
        if (pollRef.current) clearInterval(pollRef.current);
        // Iniciar countdown de 10 min para completar la compra
        const expiresAt = new Date(Date.now() + SESSION_EXPIRE);
        startCountdown(expiresAt);
      }
    }, 5000);
  };

  const autoAdmit = async (waitingList: QueueEntry[]) => {
    if (waitingList.length === 0) return;
    // Ordenar por posición y admitir los primeros ADMIT_BATCH
    const sorted = [...waitingList].sort((a, b) => a.position - b.position);
    const toAdmit = sorted.slice(0, ADMIT_BATCH);
    const now = new Date();
    const expires = new Date(now.getTime() + SESSION_EXPIRE);

    for (const entry of toAdmit) {
      // TODO: Implement Next.js API call for admission
      console.log("Admitting user:", entry);
    }
  };

  const startCountdown = (expiresAt: Date) => {
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, expiresAt.getTime() - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current);
        // Expiró, marcar como expired y redirigir al evento
        if (queueEntry) {
          // TODO: Implement Next.js API call for expiration
          console.log("Session expired for:", queueEntry);
        }
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(`queue_token_${eventId}`);
        }
        router.push(`/EventDetail?id=${eventId}`);
      }
    }, 1000);
  };

  const formatTime = (ms: number) => {
    if (!ms) return "10:00";
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const estimatedWait = queueEntry
    ? Math.ceil((queueEntry.position || 1) / ADMIT_BATCH) * (ADMIT_INTERVAL / 60000)
    : 0;

  const progress = totalWaiting > 0
    ? Math.max(0, Math.min(100, ((totalWaiting - (queueEntry?.position || 1) + 1) / totalWaiting) * 100))
    : 0;

  const track = PLAYLIST[currentTrack];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      <AnimatePresence mode="wait">
        {admitted ? (
          /* ---- ADMITIDO ---- */
          <motion.div
            key="admitted"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md w-full"
          >
            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6 ring-4 ring-green-500/20">
              <ChevronRight className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">¡Es tu turno!</h2>
            <p className="text-slate-400 mb-4">Tenés <span className="text-white font-bold">{formatTime(timeLeft!)}</span> para completar tu compra.</p>
            <div className="w-full bg-slate-800 rounded-full h-2 mb-8 overflow-hidden">
              <motion.div
                className="h-full bg-green-500 rounded-full"
                initial={{ width: "100%" }}
                animate={{ width: `${(timeLeft! / SESSION_EXPIRE) * 100}%` }}
                transition={{ duration: 1 }}
              />
            </div>
            <Button
              onClick={proceedToCheckout}
              className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 border-0 shadow-lg shadow-green-500/25"
            >
              Ir a la compra →
            </Button>
          </motion.div>
        ) : (
          /* ---- EN ESPERA ---- */
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
          >
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-5">
                <Users className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs text-violet-300 font-medium">Sala de Espera Virtual</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Tu lugar está reservado</h1>
              <p className="text-slate-400">Hay mucha demanda en este evento. Mantené esta pantalla abierta.</p>
            </div>

            {/* Queue Card */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-6 sm:p-8 mb-6">
              {/* Position */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Tu posición</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                      #{queueEntry?.position || "—"}
                    </span>
                    <span className="text-slate-500 text-sm">de {totalWaiting}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Espera estimada</p>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-2xl font-bold text-white">~{estimatedWait} min</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Progreso de la fila</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-500"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Actualización automática cada 5 segundos
              </p>
            </div>

            {/* Music/Video Section */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl overflow-hidden">
              {/* Tab controls */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/50">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium text-white">Mientras esperás...</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMuted(!muted)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showVideo ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              {showVideo && (
                <div className="relative" style={{ paddingTop: "56.25%" }}>
                  <iframe
                    key={currentTrack}
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${track.id}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${track.id}&controls=1&rel=0&modestbranding=1`}
                    title={track.title}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Track selector */}
              <div className="p-4">
                <p className="text-xs text-slate-500 mb-2">Cambiar canal:</p>
                <div className="flex gap-2 flex-wrap">
                  {PLAYLIST.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => setCurrentTrack(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        i === currentTrack
                          ? "bg-violet-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-700 mt-6">
              No cierres esta ventana — perderías tu lugar en la fila.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
