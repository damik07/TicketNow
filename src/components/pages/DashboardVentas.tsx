"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Loader2, RefreshCw, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

import StatsGrid from "@/components/dashboard/StatsGrid";
import SalesChart from "@/components/dashboard/SalesChart";
import EventsTable from "@/components/dashboard/EventsTable";
import MpConnectBanner from "@/components/dashboard/MpConnectBanner";
import DateFilter from "@/components/dashboard/DateFilter"; // 👈 SOLUCIÓN 1: Importación agregada correctamente

interface Organizer {
  id: string;
  user_id: string;
  business_name: string;
  verified: boolean;
  mercadopago_user_id?: string | null;
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
  const [refreshInterval, setRefreshInterval] = useState<number>(300);

  const [endDate, setEndDate] = useState<string>(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });

  // Inicializamos startDate con la fecha de hace 7 días
  const [startDate, setStartDate] = useState<string>(() => {
    const haceSieteDias = new Date();
    haceSieteDias.setDate(haceSieteDias.getDate() - 7);
    return haceSieteDias.toISOString().split('T')[0];
  });



  const loadData = useCallback(async (currentOrganizer: Organizer) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsRefreshing(true);

    try {
      const [eventsResponse, ordersResponse, ticketsResponse] = await Promise.all([
        fetch(`/api/events?organizerId=${currentOrganizer.id}`),
        fetch(`/api/orders?organizerId=${currentOrganizer.id}`),
        fetch(`/api/tickets?organizerId=${currentOrganizer.id}`)
      ]);

      const eventsData = await eventsResponse.json();
      const ordersData = await ordersResponse.json();
      const ticketsData = await ticketsResponse.json();

      // 1. Normalizar Eventos
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

      // 2. Normalizar Órdenes
      const normalizedOrders = ordersData.map((o: any) => {
        let ticketOnlyTotal = 0;
        const rawItems = o.orderItems || o.order_items || o.items;

        if (rawItems && Array.isArray(rawItems)) {
          rawItems.forEach((item: any) => {
            const ticketTypeObj = item.ticketType || item.ticket_type;
            const basePrice = ticketTypeObj?.price ?? item.unitPrice ?? 0;
            const quantity = item.quantity ?? 0;
            ticketOnlyTotal += basePrice * quantity;
          });
        }

        return {
          id: o.id,
          event_id: o.eventId || o.event_id,
          user_id: o.userId || o.user_id,
          user_email: o.userEmail || o.user_email,
          user_name: o.userName || o.user_name,
          event_title: o.eventTitle || o.event_title,
          items: rawItems || [],
          total_amount: ticketOnlyTotal > 0 ? ticketOnlyTotal : (o.totalAmount || o.total_amount || 0),
          payment_status: o.paymentStatus || o.payment_status,
          payment_method: o.paymentMethod || o.payment_method,
          created_date: o.createdAt || o.created_date,
        };
      });

      // 3. Normalizar Tickets
      const normalizedTickets = ticketsData.map((t: any) => ({
        id: t.id,
        order_id: t.orderId || t.order_id,
        ticket_type_id: t.ticketTypeId || t.ticket_type_id,
        event_id: t.eventId || t.event_id,
        user_id: t.userId || t.user_id,
        created_date: t.createdAt || t.created_date || null
      }));

      setEvents(normalizedEvents);
      setAllOrders(normalizedOrders);
      setAllTickets(normalizedTickets);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error("Error al refrescar los datos");
    } finally {
      isLoadingRef.current = false;
      setIsRefreshing(false);
      setLoading(false);
    }
  }, []);

  // 🛡️ SOLUCIÓN 2: Filtro useMemo optimizado y seguro para evitar problemas de tipos
  const filteredData = useMemo(() => {
    let orders = [...allOrders];
    let tickets = [...allTickets];

    if (startDate) {
      // Forzamos el inicio del día en formato local
      const start = new Date(`${startDate}T00:00:00`);
      orders = orders.filter((o) => {
        if (!o.created_date) return false;
        return new Date(o.created_date) >= start;
      });

      tickets = tickets.filter((t) => {
        const parentOrder = orders.find(o => o.id === t.order_id);
        const ticketDate = parentOrder ? new Date(parentOrder.created_date) : null;
        return ticketDate ? ticketDate >= start : true;
      });
    }

    if (endDate) {
      // Forzamos el último segundo del día para incluir las ventas de hoy
      const end = new Date(`${endDate}T23:59:59`);
      orders = orders.filter((o) => {
        if (!o.created_date) return false;
        return new Date(o.created_date) <= end;
      });

      tickets = tickets.filter((t) => {
        const parentOrder = orders.find(o => o.id === t.order_id);
        const ticketDate = parentOrder ? new Date(parentOrder.created_date) : null;
        return ticketDate ? ticketDate <= end : true;
      });
    }

    return { orders, tickets };
  }, [allOrders, allTickets, startDate, endDate]);

  const handleClearFilters = () => {
    const hoy = new Date();
    const haceSieteDias = new Date();
    haceSieteDias.setDate(haceSieteDias.getDate() - 7);

    setEndDate(hoy.toISOString().split('T')[0]);
    setStartDate(haceSieteDias.toISOString().split('T')[0]);
  };

  const refreshOrganizerData = useCallback(async () => {
    if (!user) return;
    try {
      const organizerResponse = await fetch(`/api/organizers?userId=${user.id}`);
      const organizersData = await organizerResponse.json();
      if (organizersData.length > 0) {
        setOrganizer(organizersData[0]);
      }
    } catch (e) {
      console.error("Error recargando datos del organizador", e);
    }
  }, [user]);

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

  useEffect(() => {
    if (!organizer || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      loadData(organizer);
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [organizer, refreshInterval, loadData]);

  if (loading || isLoadingAuth) {
    return (
      <div className="flex justify-center py-20 min-h-screen bg-slate-950 items-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-7xl mx-auto px-4">

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

        <div className="space-y-6">
          {organizer && (
            <MpConnectBanner
              organizerId={organizer.id}
              mercadopagoUserId={organizer.mercadopago_user_id}
              onRefreshOrganizer={refreshOrganizerData}
            />
          )}

          <DateFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClearFilters={handleClearFilters}
          />

          <StatsGrid
            events={events}
            orders={filteredData.orders}
            tickets={filteredData.tickets}
          />

          {/* 📊 FILA 1: Gráfico ocupando todo el ancho */}
          <div className="w-full">
            <SalesChart
              orders={filteredData.orders}
              startDate={startDate}
              endDate={endDate}
            />
          </div>

          {/* 📋 FILA 2: Tabla de eventos ocupando todo el ancho debajo del gráfico */}
          <div className="w-full">
            <EventsTable
              events={events}
              orders={allOrders}
              onEventUpdate={() => organizer && loadData(organizer)}
              onEventDelete={() => organizer && loadData(organizer)}
            />
          </div>

        </div>
      </div>
    </div>
  );
}