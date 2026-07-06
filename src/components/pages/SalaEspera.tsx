"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Users, Clock, ChevronRight, Music, Volume2, VolumeX, RefreshCw, Plus, Link2, Search, Play, Pause, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Playlist base de videos de YouTube
const PLAYLIST = [
  { id: "jfKfPfyJRdk", title: "Lo-fi Hip Hop Radio", artist: "Lofi Girl" },
  { id: "5qap5aO4i9A", title: "Lofi Chill Beats", artist: "ChilledCow" },
  { id: "rUxyKA_-grg", title: "Jazz Cafe Radio", artist: "Cafe Music BGM" },
  { id: "kgx4WGK0oNU", title: "Deep House Music", artist: "NoCopyrightSounds" },
];

const SESSION_EXPIRE = 10 * 60 * 1000;

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

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  if (url.trim().length === 11 && !url.includes("/")) {
    return url.trim();
  }
  return null;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

// 💡 Subcomponente interno con toda la lógica de la Sala de Espera
function SalaEsperaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("event_id");
  const checkoutUrl = searchParams.get("checkout_url") ? decodeURIComponent(searchParams.get("checkout_url")!) : null;

  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [maxConcurrent, setMaxConcurrent] = useState(50);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Gestión de música/playlist e integración API
  const [currentTrack, setCurrentTrack] = useState(0);
  const [customTrack, setCustomTrack] = useState<{ id: string; title: string; artist: string } | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showVideo, setShowVideo] = useState(true);

  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const playerRef = useRef<any>(null);
  const containerId = "youtube-player-container";

  const proceedToCheckout = useCallback(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (checkoutUrl) window.location.href = checkoutUrl;
  }, [checkoutUrl]);

  // Cargar el script de la API de YouTube de forma dinámica
  useEffect(() => {
    if (typeof window === "undefined" || !showVideo) return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, [showVideo]);

  const track = currentTrack === -1 && customTrack ? customTrack : PLAYLIST[currentTrack] || PLAYLIST[0];

  // Inicializar o actualizar el reproductor mediante la API
  useEffect(() => {
    if (typeof window === "undefined" || !window.YT || !showVideo) return;

    const initPlayer = () => {
      if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
        playerRef.current.loadVideoById({
          videoId: track.id,
          suggestedQuality: "default"
        });
        if (muted) playerRef.current.mute(); else playerRef.current.unMute();
        return;
      }

      playerRef.current = new window.YT.Player(containerId, {
        height: "100%",
        width: "100%",
        videoId: track.id,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (e: any) => {
            if (muted) e.target.mute();
            e.target.playVideo();
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              playerRef.current.loadVideoById(track.id);
            }
            if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
            if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, [track.id, showVideo]);

  // Controles Manuales personalizados que hablan con la API
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.mute === "function") {
      if (muted) playerRef.current.mute(); else playerRef.current.unMute();
    }
  }, [muted]);

  // Manejo de búsqueda dinámica a través de la API propia
  const handleSearchOrLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    const directId = extractYouTubeId(searchInput);
    if (directId) {
      setCustomTrack({ id: directId, title: "Video por enlace", artist: "Usuario" });
      setCurrentTrack(-1);
      setSearchInput("");
      setSearchResults([]);
      toast.success("¡Cargado por enlace directo!");
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(searchInput)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (data.videos && data.videos.length > 0) {
        setSearchResults(data.videos);
      } else {
        toast.error("No se encontraron resultados.");
      }
    } catch (err) {
      toast.error("Error al buscar en YouTube.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchedVideo = (video: any) => {
    const parser = new DOMParser();
    const cleanTitle = parser.parseFromString(video.title, 'text/html').body.textContent || video.title;

    setCustomTrack({
      id: video.id,
      title: cleanTitle,
      artist: video.artist
    });
    setCurrentTrack(-1);
    setSearchResults([]);
    setSearchInput("");
    toast.success("Reproduciendo selección");
  };

  // --- Lógica de la cola optimizada con consulta inicial inmediata ---
  const startPolling = useCallback((token: string) => {
    fetch("/api/queue/admit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId })
    }).catch(err => console.error(err));

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/queue/status?token=${token}&eventId=${eventId}`);

        if (!res.ok) {
          console.warn("El servidor de cola está experimentando demoras, reintentando...");
          return;
        }

        const data = await res.json();

        if (data.error) {
          console.log("Reintentando lectura por saturación de DB...");
          return;
        }

        if (data.status === "admitted") {
          setQueueEntry(prev => prev ? { ...prev, status: "admitted", expires_at: data.expiresAt } : null);
          if (data.expiresAt) {
            startCountdown(new Date(data.expiresAt));
          }
        } else if (data.status === "expired") {
          router.push(`/EventDetail?id=${eventId}`);
        } else {
          const nuevaPosicion = data.currentPosition || data.position || 0;
          const totalEspera = data.totalWaiting || data.total_waiting || 0;
          if (typeof data.maxConcurrent === 'number') {
            setMaxConcurrent(data.maxConcurrent);
          }

          setTotalWaiting(totalEspera);
          setQueueEntry(prev => prev ? { ...prev, position: nuevaPosicion } : null);
        }
      } catch (err) {
        console.error("Error de red consultando estado:", err);
      }
    };

    checkStatus();

    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(checkStatus, 4000);
  }, [eventId, router]);

  const startCountdown = (expiresAt: Date) => {
    if (timerRef.current) window.clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, expiresAt.getTime() - Date.now());
      setTimeLeft(remaining);

      if (remaining === 0) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(`queue_token_${eventId}`);
        }
        router.push(`/EventDetail?id=${eventId}`);
      }
    }, 1000);
  };

  useEffect(() => {
    const initQueue = async () => {
      if (!eventId) return;

      try {
        let storedToken = typeof window !== 'undefined' && window.sessionStorage
          ? window.sessionStorage.getItem(`queue_token_${eventId}`)
          : null;

        if (!storedToken) {
          const res = await fetch("/api/queue/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId })
          });
          const data = await res.json();

          if (data.action === "allow_checkout") {
            if (checkoutUrl) window.location.href = checkoutUrl;
            return;
          }

          storedToken = data.sessionToken;
          if (typeof window !== 'undefined' && window.sessionStorage && storedToken) {
            window.sessionStorage.setItem(`queue_token_${eventId}`, storedToken);
          }
        }

        setQueueEntry({
          id: "",
          event_id: eventId,
          user_id: "",
          session_token: storedToken!,
          position: 0,
          status: "waiting"
        });

        setLoading(false);
        startPolling(storedToken!);

      } catch (err) {
        console.error("Error al inicializar la sala de espera:", err);
        setLoading(false);
      }
    };

    initQueue();

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [eventId, checkoutUrl, startPolling]);

  const formatTime = (ms: number) => {
    if (!ms) return "10:00";
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isAdmitted = queueEntry?.status === "admitted";
  const currentPos = queueEntry?.position || 0;

  const estimatedWait = currentPos > 0
    ? Math.max(1, Math.ceil(currentPos / Math.max(1, maxConcurrent))) * 10
    : 0;

  const progress = totalWaiting > 0 && currentPos > 0
    ? Math.max(0, Math.min(100, ((totalWaiting - currentPos + 1) / totalWaiting) * 100))
    : 0;

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
        {isAdmitted ? (
          <motion.div key="admitted" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md w-full">
            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6 ring-4 ring-green-500/20">
              <ChevronRight className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">¡Es tu turno!</h2>
            <p className="text-slate-400 mb-4">Tenés <span className="text-white font-bold">{formatTime(timeLeft || SESSION_EXPIRE)}</span> para completar tu compra.</p>
            <div className="w-full bg-slate-800 rounded-full h-2 mb-8 overflow-hidden">
              <motion.div
                className="h-full bg-green-500 rounded-full"
                initial={{ width: "100%" }}
                animate={{ width: `${((timeLeft || SESSION_EXPIRE) / SESSION_EXPIRE) * 100}%` }}
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
          <motion.div key="waiting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-5">
                <Users className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs text-violet-300 font-medium">Sala de Espera Virtual</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Tu lugar está reservado</h1>
              <p className="text-slate-400">Hay mucha demanda en este evento. Mantené esta pantalla abierta.</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-6 sm:p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Tu posición</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                      {currentPos > 0 ? `#${currentPos}` : "Calculando..."}
                    </span>
                    {totalWaiting > 0 && (
                      <span className="text-slate-500 text-sm">de {totalWaiting}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Espera estimada</p>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-2xl font-bold text-white">
                      {estimatedWait > 0 ? `~${estimatedWait} min` : "Menos de 1 min"}
                    </span>
                  </div>
                </div>
              </div>

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
                <RefreshCw className="w-3 h-3" /> Actualización automática cada 4 segundos
              </p>
            </div>

            {/* Sección Multimedia de YouTube */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/50">
                <div className="flex items-center gap-2 truncate mr-4">
                  <button onClick={togglePlay} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-2 truncate">
                    <Music className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-white truncate">
                      Sonando: <span className="text-violet-400 font-semibold">{track.title}</span> ({track.artist})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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
                <div className="relative w-full aspect-video bg-black group">
                  <div id={containerId} className="absolute inset-0 w-full h-full" />
                  <div className="absolute inset-0 z-10 bg-transparent cursor-default" onClick={togglePlay} />
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-violet-600 p-4 rounded-full shadow-xl">
                      {isPlaying ? <Pause className="text-white w-6 h-6" /> : <Play className="text-white w-6 h-6" />}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <ListMusic className="w-3.5 h-3.5" /> Canales de la casa:
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {PLAYLIST.map((t, i) => (
                      <button
                        key={t.id}
                        onClick={() => { setCurrentTrack(i); setSearchResults([]); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${i === currentTrack
                          ? "bg-violet-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                          }`}
                      >
                        {t.title}
                      </button>
                    ))}

                    {customTrack && (
                      <button
                        onClick={() => setCurrentTrack(-1)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentTrack === -1
                          ? "bg-purple-600 text-white ring-2 ring-purple-400/50"
                          : "bg-slate-800/80 text-purple-400 border border-purple-500/20 hover:bg-slate-700"
                          }`}
                      >
                        Imágenes/Mi Selección
                      </button>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSearchOrLoad} className="border-t border-slate-800/60 pt-3">
                  <label className="text-xs text-slate-500 block mb-1.5">¿Preferís buscar música? Escribí un tema o pegá un link:</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        type="text"
                        placeholder="Ej: Coldplay live o link de YouTube..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="bg-slate-950/60 border-slate-800 pl-9 text-xs text-slate-300 h-9 focus-visible:ring-violet-500"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSearching}
                      className="h-9 bg-slate-800 hover:bg-violet-600 text-slate-300 hover:text-white transition-colors gap-1 px-3 text-xs"
                    >
                      {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Buscar"}
                    </Button>
                  </div>
                </form>

                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1 mt-2 shadow-xl"
                  >
                    <p className="text-[10px] text-slate-500 px-2 py-1 uppercase tracking-wider">Sugerencias encontradas:</p>
                    {searchResults.map((video) => (
                      <button
                        key={video.id}
                        onClick={() => selectSearchedVideo(video)}
                        className="w-full text-left flex items-center gap-3 p-1.5 hover:bg-slate-800/60 rounded-lg transition-colors group"
                      >
                        <img
                          src={video.thumbnail}
                          alt=""
                          className="w-12 aspect-video object-cover rounded bg-slate-950 flex-shrink-0 border border-slate-800"
                        />
                        <div className="truncate flex-1">
                          <p
                            className="text-xs font-medium text-slate-200 group-hover:text-violet-400 transition-colors truncate"
                            dangerouslySetInnerHTML={{ __html: video.title }}
                          />
                          <p className="text-[10px] text-slate-500 truncate">{video.artist}</p>
                        </div>
                        <Play className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors mr-1 flex-shrink-0" />
                      </button>
                    ))}
                  </motion.div>
                )}
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

// 💡 Exportación por defecto envuelta en Suspense requerida por Next.js App Router
export default function SalaEspera() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    }>
      <SalaEsperaContent />
    </React.Suspense>
  );
}