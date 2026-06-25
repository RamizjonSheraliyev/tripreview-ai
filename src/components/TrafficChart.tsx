"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeriesPoint } from "@/lib/api";

export default function TrafficChart({ data }: { data: SeriesPoint[] }) {
  const fmt = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradBookings" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} />
        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#0f1626", border: "1px solid #1c2742", borderRadius: 12, fontSize: 12, color: "#e2e8f0" }}
          labelFormatter={(l) => fmt(String(l))}
          labelStyle={{ color: "#94a3b8" }}
        />
        <Area type="monotone" dataKey="users" name="New users" stroke="#3b82f6" strokeWidth={2} fill="url(#gradUsers)" />
        <Area type="monotone" dataKey="bookings" name="Bookings" stroke="#a855f7" strokeWidth={2} fill="url(#gradBookings)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
