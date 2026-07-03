import React from "react";
import { DollarSign, Ticket, CalendarCheck, TrendingUp } from "lucide-react";

interface Event {
  id: string;
  status?: string;
}

interface Order {
  id: string;
  payment_status?: string;
  total_amount?: number;
}

interface Ticket {
  id: string;
}

interface StatsGridProps {
  events: Event[];
  orders: Order[];
  tickets: Ticket[];
}

export default function StatsGrid({ events, orders, tickets }: StatsGridProps) {
  // Filtramos las órdenes aprobadas y sumamos el total_amount (que ya viene neto desde el loadData)
  const totalRevenue = orders
    .filter((o: Order) => o.payment_status === "aprobado" || o.payment_status === "approved")
    .reduce((sum: number, o: Order) => sum + (o.total_amount || 0), 0);

  const totalTicketsSold = tickets.length;
  const publishedEvents = events.filter((e: Event) => e.status === "publicado").length;
  const avgTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

  const stats = [
    { label: "Ingresos Totales", value: `$${totalRevenue.toLocaleString("es-AR")}`, icon: DollarSign, color: "from-green-500 to-emerald-600" },
    { label: "Entradas Vendidas", value: totalTicketsSold.toLocaleString(), icon: Ticket, color: "from-violet-500 to-purple-600" },
    { label: "Eventos Publicados", value: publishedEvents, icon: CalendarCheck, color: "from-blue-500 to-cyan-600" },
    { label: "Ticket Promedio", value: `$${Math.round(avgTicketPrice).toLocaleString("es-AR")}`, icon: TrendingUp, color: "from-amber-500 to-orange-600" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 font-medium">{s.label}</span>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{s.value}</p>
        </div>
      ))}
    </div>
  );
}