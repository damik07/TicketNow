"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  status: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current session
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.error) {
          router.push('/login');
          return;
        }

        if (data.user.role !== 'organizer') {
          toast.error('No tienes permisos de organizador');
          router.push('/');
          return;
        }

        setUser(data.user);

        // Get organizer data
        const organizerResponse = await fetch(`/api/organizers?userId=${data.user.id}`);
        const organizersData = await organizerResponse.json();
        
        if (organizersData.error || !organizersData.length) {
          toast.error('No tienes cuenta de organizador');
          router.push('/SerOrganizador');
          return;
        }

        setOrganizer(organizersData[0]);

        // Load events, orders and tickets
        const [eventsResponse, ordersResponse, ticketsResponse] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/orders'),
          fetch('/api/tickets')
        ]);

        const eventsData = await eventsResponse.json();
        const ordersData = await ordersResponse.json();
        const ticketsData = await ticketsResponse.json();

        // Filter events for this organizer
        const organizerEvents = eventsData.filter((event: any) => 
          event.organizerId === organizersData[0].id
        );

        setEvents(organizerEvents);
        setAllOrders(ordersData);
        setAllTickets(ticketsData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard de Ventas</h1>
          <p className="text-slate-500 mt-1">Reportes en tiempo real de tus eventos</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="space-y-6">
            <StatsGrid events={events} orders={allOrders} tickets={allTickets} />
            <SalesChart orders={allOrders} />
            <EventsTable events={events} orders={allOrders} />
          </div>
        )}
      </div>
    </div>
  );
}
