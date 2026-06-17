"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, RefreshCw, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

import StatsGrid from "@/components/dashboard/StatsGrid";
import SalesChart from "@/components/dashboard/SalesChart";
import EventsTable from "@/components/dashboard/EventsTable";

interface User {
  id: string;
  full_name: string;
  role: string;
}

interface Organizer {
  id: string;
  user_id: string;
  business_name: string;
  verified: boolean;
}

interface Event {
  id: string;
  title: string;
  location_name: string;
  date_time: string;
  status: 'borrador' | 'publicado' | 'finalizado' | 'cancelado';
  created_date: string;
  total_capacity?: number;
  min_price?: number;
}

interface Order {
  id: string;
  event_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  event_title: string;
  items: any[];
  total_amount: number;
  payment_status: string;
  payment_method: string;
  created_date: string;
}

interface Ticket {
  id: string;
  order_id: string;
  ticket_type_id: string;
  event_id: string;
  user_id: string;
  event_title: string;
  event_date: string;
  event_location: string;
  ticket_type_name: string;
  qr_code: string;
  usage_status: string;
  holder_name: string;
  holder_email: string;
}

export default function DashboardVentas() {
  const router = useRouter();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingRef = useRef(false);

  // Variable de control de latencia/frecuencia (en segundos). Por defecto 5 minutos en pruebas.
  const [refreshInterval, setRefreshInterval] = useState<number>(300);

  // loadData optimizado recibiendo parámetros directos
  const loadData = useCallback(async (currentOrganizer: Organizer) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsRefreshing(true);

    try {
      // OPTIMIZACIÓN CLAVE: Pasamos el organizerId por Query Params a las APIs
      // Tu backend debe aceptar ?organizerId=... para filtrar en la base de datos
      const [eventsResponse, ordersResponse, ticketsResponse] = await Promise.all([
        fetch(`/api/events?organizerId=${currentOrganizer.id}`),
        fetch(`/api/orders?organizerId=${currentOrganizer.id}`),
        fetch(`/api/tickets?organizerId=${currentOrganizer.id}`)
      ]);

      const eventsData = await eventsResponse.json();
      const ordersData = await ordersResponse.json();
      const ticketsData = await ticketsResponse.json();

      const normalizedEvents = eventsData.map((e: any) => ({
        id: e.id,
        title: e.title,
        status: e.status,
        location_name: e.locationName || e.location_name,
        date_time: e.dateTime || e.date_time,
        created_date: e.createdAt || e.created_date,
        total_capacity: e.totalCapacity || e.total_capacity,
        min_price: e.minPrice || e.min_price,
      }));

      // Guardamos los datos normalizados
      setEvents(normalizedEvents);
      setAllOrders(ordersData);
      setAllTickets(ticketsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error("Error al refrescar los datos");
    } finally {
      isLoadingRef.current = false;
      setIsRefreshing(false);
      setLoading(false);
    }
  }, []);

// 1. Efecto Orquestador de Autenticación y primer fetch de Organizador
  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isAuthenticated || !user) {
      router.push('/Login');
      return;
    }

    if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
      toast.error("No tienes permisos para acceder al dashboard.");
      router.push('/SerOrganizador');
      return;
    }

    async function fetchOrganizerOnce() {
      if (!user) return;
      try {
        const organizerResponse = await fetch(`/api/organizers?userId=${user.id}`);
        const organizersData = await organizerResponse.json();
        
        if (organizersData.error || !organizersData.length) {
          toast.error("No se encontró tu cuenta de organizador");
          router.push('/SerOrganizador');
          return;
        }

        const org = organizersData[0];
        setOrganizer(org);
        // Disparamos la carga inicial de métricas inmediatamente
        loadData(org);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }

    if (!organizer) {
      fetchOrganizerOnce();
    }
  }, [isLoadingAuth, isAuthenticated, user, organizer, loadData, router]);

  // 2. Efecto de Polling Dinámico controlado por la variable refreshInterval
  useEffect(() => {
    // Si no hay organizador o el intervalo se define en 0 (desactivado), no hacemos polling
    if (!organizer || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      loadData(organizer);
    }, refreshInterval * 1000); // Convertimos segundos a milisegundos

    return () => clearInterval(intervalId); // Limpieza crucial al desmontar o cambiar intervalo
  }, [organizer, refreshInterval, loadData]);

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* PANEL DE CONTROL EXCLUSIVO PARA ADMIN */}
        {user?.role === 'ADMIN' && (
          <div className="mb-6 p-4 bg-slate-900 border border-violet-500/30 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-violet-400">
              <Settings className="w-5 h-5" />
              <span className="text-sm font-semibold text-white">Panel Admin: Control de Latencia</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Intervalo de refresco (segundos):</label>
              <input
                type="number"
                min={0}
                max={300}
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 text-white rounded text-center text-sm focus:outline-none focus:border-violet-500"
              />
              <span className="text-xs text-slate-500">
                {refreshInterval === 0 ? "(Refresco automático desactivado)" : `(Cada ${refreshInterval}s)`}
              </span>
            </div>
          </div>
        )}

        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard de Ventas</h1>
            <p className="text-slate-500 mt-1">Reportes en tiempo real de tus eventos</p>
          </div>
          {organizer && (
            <button 
              onClick={() => loadData(organizer)} 
              disabled={isRefreshing}
              className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-violet-400' : ''}`} />
            </button>
          )}
        </div>

        {loading || isLoadingAuth ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="space-y-6">
            <StatsGrid events={events} orders={allOrders} tickets={allTickets} />
            <SalesChart orders={allOrders} />
            <EventsTable 
              events={events} 
              orders={allOrders} 
              onEventUpdate={() => organizer && loadData(organizer)}
              onEventDelete={() => organizer && loadData(organizer)}
            />
          </div>
        )}
      </div>
    </div>
  );
}