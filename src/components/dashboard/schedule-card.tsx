import { memo } from "react";
import { CalendarDays } from "lucide-react";

interface ScheduleCardProps {
  type: string;
  title: string;
  date: string;
  time: string;
}

export const ScheduleCard = memo(function ScheduleCard({ type, title, date, time }: ScheduleCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card-soft">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <CalendarDays className="h-4 w-4 text-brand-secondary" />
        {type}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
        <span>{date}</span>
        <span className="h-1 w-1 rounded-full bg-slate-400" />
        <span>{time}</span>
      </div>
    </div>
  );
});
