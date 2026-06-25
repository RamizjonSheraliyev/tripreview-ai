"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { Category } from "@/lib/api";

const COLORS = ["#3b82f6", "#a855f7", "#f59e0b", "#22c55e", "#ec4899", "#06b6d4", "#ef4444", "#84cc16"];

export default function LeadsDonut({ data }: { data: Category[] }) {
  const total = data.reduce((s, c) => s + c.listings, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="listings" nameKey="name" cx="50%" cy="50%" innerRadius={64} outerRadius={92} paddingAngle={2} stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-2xl font-extrabold text-white">{total.toLocaleString()}</div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Total listings</div>
      </div>
    </div>
  );
}

export { COLORS };
