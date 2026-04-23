import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Event {
  id: string;
  title: string;
  date_time: string;
  status: 'borrador' | 'publicado' | 'finalizado' | 'cancelado';
}

interface Order {
  id: string;
  event_id: string;
  payment_status: string;
  total_amount: number;
  items?: Array<{
    quantity: number;
  }>;
}

interface EventsTableProps {
  events: Event[];
  orders: Order[];
}

const STATUS_STYLES = {
  borrador: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  publicado: "bg-green-500/10 text-green-400 border-green-500/30",
  finalizado: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  cancelado: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function EventsTable({ events, orders }: EventsTableProps) {
  const getEventSales = (eventId: string) => {
    const eventOrders = orders.filter((o) => o.event_id === eventId && o.payment_status === "aprobado");
    return eventOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  };

  const getEventTickets = (eventId: string) => {
    const eventOrders = orders.filter((o) => o.event_id === eventId && o.payment_status === "aprobado");
    return eventOrders.reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0), 0);
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Mis Eventos</h3>
          <Link to={createPageUrl("CrearEvento")}>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 border-0 text-sm">
              + Nuevo Evento
            </Button>
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-500">Evento</TableHead>
              <TableHead className="text-slate-500">Fecha</TableHead>
              <TableHead className="text-slate-500">Estado</TableHead>
              <TableHead className="text-slate-500 text-right">Vendidas</TableHead>
              <TableHead className="text-slate-500 text-right">Ingresos</TableHead>
              <TableHead className="text-slate-500 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((ev) => (
              <TableRow key={ev.id} className="border-slate-800/50 hover:bg-slate-800/20">
                <TableCell className="font-medium text-white">{ev.title}</TableCell>
                <TableCell className="text-slate-400 text-sm">
                  {ev.date_time ? format(new Date(ev.date_time), "d MMM yyyy", { locale: es }) : "-"}
                </TableCell>
                <TableCell>
                  <Badge className={`${STATUS_STYLES[ev.status] || STATUS_STYLES.borrador} border text-xs`}>
                    {ev.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-white font-medium">{getEventTickets(ev.id)}</TableCell>
                <TableCell className="text-right text-white font-medium">${getEventSales(ev.id).toLocaleString("es-AR")}</TableCell>
                <TableCell className="text-right">
                  <Link to={createPageUrl(`EventDetail?id=${ev.id}`)}>
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No hay eventos creados</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}