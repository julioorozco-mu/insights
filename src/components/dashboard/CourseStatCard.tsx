"use client";

import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useCourseRatingStats } from "@/hooks/useCourseRatingStats";

interface CourseStatCardProps {
  courseId: string;
  userId: string;
  courseTitle: string;
  onDataLoaded?: (data: {
    progress: number;
    completedLessons: number;
    totalLessons: number;
    averageRating: number;
    reviewsCount: number;
  }) => void;
}

/**
 * Componente que usa los hooks de curso para obtener progreso y rating
 * Útil para mostrar estadísticas individuales de cada curso
 */
export function CourseStatCard({
  courseId,
  userId,
  courseTitle,
  onDataLoaded,
}: CourseStatCardProps) {
  // Usar los hooks existentes
  const { data: progressData, loading: progressLoading } = useCourseProgress(courseId, userId);
  const { averageRating, reviewsCount, loading: ratingLoading } = useCourseRatingStats(courseId);

  // Notificar cuando los datos estén listos
  if (!progressLoading && !ratingLoading && progressData && onDataLoaded) {
    onDataLoaded({
      progress: progressData.progress,
      completedLessons: progressData.completedLessons.length,
      totalLessons: progressData.totalLessons,
      averageRating,
      reviewsCount,
    });
  }

  if (progressLoading || ratingLoading) {
    return (
      <div className="animate-pulse bg-slate-100 rounded-lg p-4">
        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
      <h4 className="font-medium text-slate-900 mb-2 truncate">{courseTitle}</h4>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-primary rounded-full transition-all"
              style={{ width: `${progressData?.progress || 0}%` }}
            />
          </div>
          <span className="text-slate-600 font-medium">
            {progressData?.progress || 0}%
          </span>
        </div>
        {reviewsCount > 0 && (
          <div className="flex items-center gap-1 text-amber-500">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
            <span className="text-slate-600">{averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1">
        {progressData?.completedLessons.length || 0} / {progressData?.totalLessons || 0} lecciones
      </p>
    </div>
  );
}

export default CourseStatCard;

