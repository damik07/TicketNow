// src/components/dashboard/SalesChart.tsx
import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfDay, differenceInDays, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";

interface Order {
  id: string;
  created_date?: string;
  total_amount?: number;
  payment_status?: string;
}

interface SalesChartProps {
  orders: Order[];
  startDate: string;
  endDate: string;
}

export default function SalesChart({ orders, startDate, endDate }: SalesChartProps) {
  
  const chartData = useMemo(() => {
    let minDate = startOfDay(subDays(new Date(), 7));
    let maxDate = startOfDay(new Date());

    if (startDate) {
      const parsedStart = new Date(`${startDate}T00:00:00`);
      if (!isNaN(parsedStart.getTime())) minDate = startOfDay(parsedStart);
    }
    
    if (endDate) {
      const parsedEnd = new Date(`${endDate}T00:00:00`);
      if (!isNaN(parsedEnd.getTime())) maxDate = startOfDay(parsedEnd);
    }

    const daysRange = Math.max(differenceInDays(maxDate, minDate) + 1, 1);

    return Array.from({ length: daysRange }, (_, i) => {
      const day = addDays(minDate, i);
      const dayStr = format(day, "yyyy-MM-dd");

      // 🚀 Buscamos SOLAMENTE órdenes aprobadas para este día en la zona horaria local
      const dayOrders = orders.filter((o: Order) => {
        if (!o.created_date) return false;

        // Validamos estado de pago aprobado
        const isApproved = o.payment_status === "aprobado" || o.payment_status === "approved";
        if (!isApproved) return false;

        // Formateamos la fecha en hora local antes de comparar
        const orderDate = new Date(o.created_date);
        if (isNaN(orderDate.getTime())) return false;

        const oDateStr = format(orderDate, "yyyy-MM-dd");
        return oDateStr === dayStr;
      });

      return {
        date: format(day, "dd MMM", { locale: es }),
        ventas: dayOrders.reduce((sum: number, o: Order) => sum + (Number(o.total_amount) || 0), 0),
        cantidad: dayOrders.length,
      };
    });
  }, [orders, startDate, endDate]);

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-5">Ventas</h3>
      <div className="h-64">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No hay datos para el período seleccionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", color: "#fff" }}
                formatter={(value: any) => [`$${Number(value).toLocaleString("es-AR")}`, "Ventas"]}
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
        )}
      </div>
    </div>
  );
}