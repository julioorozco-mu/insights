import Image from "next/image";
import { Bookmark, Star } from "lucide-react";
import { cn, stripHtmlAndTruncate } from "@/lib/utils";

interface CourseCardProps {
  level: "Principiante" | "Intermedio" | "Avanzado";
  title: string;
  description: string;
  students: number;
  lessons: number;
  rating: number;
  reviewsCount?: number;
  mentor: string;
  thumbnail: string;
  priority?: boolean;
}

const levelStyles: Record<string, string> = {
  Principiante: "bg-emerald-100 text-emerald-700",
  Intermedio: "bg-amber-100 text-amber-700",
  Avanzado: "bg-rose-100 text-rose-700",
};

export function CourseCard(props: CourseCardProps) {
  const levelClass = levelStyles[props.level] || "bg-slate-100 text-slate-700";
  const cleanDescription = stripHtmlAndTruncate(props.description, 120);

  return (
    <article className="flex flex-col rounded-3xl bg-white p-4 shadow-card-soft transition hover:-translate-y-1 hover:shadow-card">
      <div className="relative mb-4 overflow-hidden rounded-2xl">
        <Image
          src={props.thumbnail}
          alt={props.title}
          width={400}
          height={220}
          className="h-40 w-full object-cover"
          priority={props.priority}
          loading={props.priority ? "eager" : undefined}
        />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", levelClass)}>{props.level}</span>
          <button className="rounded-2xl bg-white/90 p-2 shadow-card-soft">
            <Bookmark className="h-4 w-4 text-brand-primary" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-primary" /> {props.students} estudiantes
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-secondary" /> {props.lessons} lecciones
          </span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">{props.title}</h3>
        <p className="flex-1 text-sm text-slate-500 line-clamp-3">{cleanDescription}</p>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="text-brand-primary font-semibold">{props.mentor}</span>
          {props.rating > 0 ? (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-900">{props.rating.toFixed(1)}</span>
              {props.reviewsCount !== undefined && props.reviewsCount > 0 && (
                <span className="text-slate-400">({props.reviewsCount})</span>
              )}
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Sin calificaciones</span>
          )}
        </div>
      </div>
    </article>
  );
}
