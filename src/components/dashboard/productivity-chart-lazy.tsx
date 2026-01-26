"use client";

import dynamic from "next/dynamic";
import type { ProductivityPoint } from "./productivity-chart";

// Skeleton component for loading state
function ProductivityChartSkeleton() {
  return (
    <div className="w-full min-h-[256px] h-[256px] animate-pulse">
      <div className="h-full bg-slate-100 rounded-lg" />
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="h-4 w-16 bg-slate-100 rounded" />
        <div className="h-4 w-20 bg-slate-100 rounded" />
        <div className="h-4 w-14 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

// Lazy loaded ProductivityChart - only loads when component is mounted
// This reduces initial bundle size by ~100KB (Recharts library)
const LazyProductivityChart = dynamic(
  () => import("./productivity-chart").then((mod) => ({ default: mod.ProductivityChart })),
  {
    loading: () => <ProductivityChartSkeleton />,
    ssr: false, // Recharts doesn't work well with SSR
  }
);

interface ProductivityChartLazyProps {
  data: ProductivityPoint[];
  labels?: {
    clases?: string;
    autoestudio?: string;
    tareas?: string;
  };
}

export function ProductivityChartLazy({ data, labels }: ProductivityChartLazyProps) {
  return <LazyProductivityChart data={data} labels={labels} />;
}
