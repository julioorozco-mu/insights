"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export type ProductivityPoint = {
  day: string;
  clases: number;
  autoestudio: number;
  tareas: number;
};

interface ProductivityChartProps {
  data: ProductivityPoint[];
  labels?: {
    clases?: string;
    autoestudio?: string;
    tareas?: string;
  };
}

export function ProductivityChart({ data, labels }: ProductivityChartProps) {
  const legendLabels = {
    clases: labels?.clases || "Clases",
    autoestudio: labels?.autoestudio || "Autoestudio",
    tareas: labels?.tareas || "Tareas",
  };

  return (
    <div className="w-full min-w-0 min-h-[256px] h-[256px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={data} barCategoryGap={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94A3B8", fontSize: 12 }}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.15)" }} content={<CustomTooltip labels={legendLabels} />} />
          <Bar dataKey="clases" fill="#192170" radius={[6, 6, 0, 0]} maxBarSize={24} />
          <Bar dataKey="autoestudio" fill="#3C1970" radius={[6, 6, 0, 0]} maxBarSize={24} />
          <Bar dataKey="tareas" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        {[
          { label: legendLabels.clases, color: "bg-brand-primary" },
          { label: legendLabels.autoestudio, color: "bg-brand-secondary" },
          { label: legendLabels.tareas, color: "bg-brand-success" },
        ].map((legend) => (
          <div key={legend.label} className="flex items-center gap-2 text-slate-600">
            <span className={cn("h-2 w-2 rounded-full", legend.color)} />
            {legend.label}
          </div>
        ))}
      </div>
    </div>
  );
}

type CustomTooltipProps = {
  active?: boolean;
  payload?: { payload: ProductivityPoint }[];
  labels: { clases: string; autoestudio: string; tareas: string };
};

function CustomTooltip({ active, payload, labels }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as ProductivityPoint;

  return (
    <div className="rounded-xl bg-white px-4 py-3 text-sm shadow-card">
      <p className="font-semibold text-brand-primary mb-2">{point.day}</p>
      <div className="space-y-1 text-slate-600">
        <p>{labels.clases}: {point.clases}%</p>
        <p>{labels.autoestudio}: {point.autoestudio}%</p>
        <p>{labels.tareas}: {point.tareas}%</p>
      </div>
    </div>
  );
}
