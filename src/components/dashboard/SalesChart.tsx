import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

interface Order {
  id: string;
  created_date?: string;
  total_amount?: number;
  payment_status?: string;
}

interface SalesChartProps {
  orders: Order[];
}

export default function SalesChart({ orders }: SalesChartProps) {
  // Aggregate last 14 days
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const day = startOfDay(subDays(new Date(), 13 - i));
    const dayStr = format(day, "yyyy-MM-dd");
    const dayOrders = orders.filter((o: Order) => {
      const oDate = o.created_date ? format(startOfDay(new Date(o.created_date)), "yyyy-MM-dd") : null;
      return oDate === dayStr;
    });
    return {
      date: format(day, "dd MMM", { locale: es }),
      ventas: dayOrders.reduce((sum: number, o: Order) => sum + (o.total_amount || 0), 0),
      cantidad: dayOrders.length,
    };
  });

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-5">Ventas (últimos 14 días)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={last14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", color: "#fff" }}
              formatter={(value) => [`$${value.toLocaleString("es-AR")}`, "Ventas"]}
            />
            <Bar dataKey="ventas" fill="url(#gradient)" radius={[6, 6, 0, 0]} />
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.6} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}