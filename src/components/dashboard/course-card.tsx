import { memo } from "react";
import Image from "next/image";
import { Bookmark, Star, Heart } from "lucide-react";
import { cn, stripHtmlAndTruncate } from "@/lib/utils";

interface CourseCardProps {
  level: "Introductorio" | "Intermedio" | "Avanzado";
  title: string;
  description: string;
  students: number;
  lessons: number;
  rating: number;
  reviewsCount?: number;
  mentor: string;
  thumbnail: string;
  priority?: boolean;
  courseId?: string;
  isFavorite?: boolean;
  loadingFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  teacherName?: string;
  teacherAvatarUrl?: string;
}

const levelStyles: Record<string, string> = {
  Introductorio: "bg-emerald-100 text-emerald-700",
  Intermedio: "bg-amber-100 text-amber-700",
  Avanzado: "bg-rose-100 text-rose-700",
};

export const CourseCard = memo(function CourseCard(props: CourseCardProps) {
  const levelClass = levelStyles[props.level] || "bg-slate-100 text-slate-700";
  const cleanDescription = stripHtmlAndTruncate(props.description, 120);

  return (
    <article className="flex h-full flex-col rounded-3xl bg-white p-4 shadow-card-soft transition hover:-translate-y-1 hover:shadow-card">
      {/* Imagen con altura fija */}
      <div className="relative mb-4 h-40 flex-shrink-0 overflow-hidden rounded-2xl">
        <Image
          src={props.thumbnail}
          alt={props.title}
          width={400}
          height={220}
          className="h-full w-full object-cover"
          priority={props.priority}
          loading={props.priority ? "eager" : undefined}
        />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", levelClass)}>{props.level}</span>
          <button 
            onClick={props.onToggleFavorite}
            disabled={props.loadingFavorite}
            className="rounded-2xl bg-white/90 p-2 shadow-card-soft hover:bg-white hover:scale-110 transition-all"
            title={props.isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          >
            {props.loadingFavorite ? (
              <span className="block w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            ) : props.isFavorite ? (
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            ) : (
              <Heart className="h-4 w-4 text-gray-500 hover:text-red-500" />
            )}
          </button>
        </div>
      </div>

      {/* Contenido con flex-1 para ocupar el espacio restante */}
      <div className="flex flex-1 flex-col space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-primary" /> {props.students} estudiantes
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-secondary" /> {props.lessons} lecciones
          </span>
        </div>
        {/* Título con altura mínima fija */}
        <h3 className="min-h-[2.75rem] text-lg font-semibold text-slate-900 line-clamp-2">{props.title}</h3>
        {/* Descripción con altura fija */}
        <p className="min-h-[3rem] text-sm text-slate-500 line-clamp-2">{cleanDescription}</p>
        {/* Footer siempre al final */}
        <div className="mt-auto flex items-center justify-between text-sm text-slate-500">
          {props.teacherName ? (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full overflow-hidden flex-shrink-0">
                {props.teacherAvatarUrl ? (
                  <Image
                    src={props.teacherAvatarUrl}
                    alt={props.teacherName}
                    width={24}
                    height={24}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-primary text-white text-xs font-semibold">
                    {props.teacherName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-brand-primary font-semibold truncate max-w-[120px]">{props.teacherName}</span>
            </div>
          ) : (
            <span className="text-brand-primary font-semibold">{props.mentor}</span>
          )}
          {props.rating > 0 ? (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-900">{props.rating.toFixed(1)}</span>
              {props.reviewsCount !== undefined && props.reviewsCount > 0 && (
                <span className="text-slate-400">({props.reviewsCount})</span>
              )}
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Sin reseñas</span>
          )}
        </div>
      </div>
    </article>
  );
});
