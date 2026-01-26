import { memo } from "react";
import Image from "next/image";

interface CourseListItemProps {
  title: string;
  sessions: string;
  thumbnail: string;
  avatars: string[];
  highlight?: string;
}

export const CourseListItem = memo(function CourseListItem({ title, sessions, thumbnail, avatars, highlight }: CourseListItemProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white px-4 py-3 shadow-card-soft">
      <div className="h-12 w-12 overflow-hidden rounded-xl">
        <Image src={thumbnail} alt={title} width={64} height={64} className="h-full w-full object-cover" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">Sesiones completadas: {sessions}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {avatars.slice(0, 4).map((avatar, index) => (
            <Image
              key={avatar + index}
              src={avatar}
              alt="Estudiante"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full border-2 border-white object-cover"
            />
          ))}
          {avatars.length > 4 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-primary text-xs font-semibold text-white">
              +{avatars.length - 4}
            </span>
          )}
        </div>
        {highlight && <span className="text-xs text-brand-primary">{highlight}</span>}
      </div>
    </div>
  );
});
