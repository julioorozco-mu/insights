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
  mentoring: number;
  selfImprove: number;
  student: number;
};

export function ProductivityChart({ data }: { data: ProductivityPoint[] }) {
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
          <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.15)" }} content={<CustomTooltip />} />
          <Bar dataKey="mentoring" fill="#192170" radius={[6, 6, 0, 0]} maxBarSize={24} />
          <Bar dataKey="selfImprove" fill="#3C1970" radius={[6, 6, 0, 0]} maxBarSize={24} />
          <Bar dataKey="student" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        {[
          { label: "Mentoring", color: "bg-brand-primary" },
          { label: "Self Improve", color: "bg-brand-secondary" },
          { label: "Student", color: "bg-brand-success" },
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
};

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as ProductivityPoint;

  return (
    <div className="rounded-xl bg-white px-4 py-3 text-sm shadow-card">
      <p className="font-semibold text-brand-primary mb-2">{point.day}</p>
      <div className="space-y-1 text-slate-600">
        <p>Mentoring: {point.mentoring}%</p>
        <p>Self Improve: {point.selfImprove}%</p>
        <p>Student: {point.student}%</p>
      </div>
    </div>
  );
}
