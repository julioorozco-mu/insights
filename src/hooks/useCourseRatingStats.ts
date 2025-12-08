import { useState, useEffect, useCallback } from "react";

/**
 * Estadísticas globales de calificación de un curso
 */
export interface CourseRatingStatsData {
  /** Promedio de calificaciones (1.00 - 5.00) */
  averageRating: number;
  /** Cantidad total de reseñas/calificaciones */
  reviewsCount: number;
}

/**
 * Resultado del hook useCourseRatingStats
 */
export interface UseCourseRatingStatsResult {
  /** Estadísticas de calificación del curso */
  data: CourseRatingStatsData;
  /** Promedio de calificaciones (acceso directo) */
  averageRating: number;
  /** Cantidad de reseñas (acceso directo) */
  reviewsCount: number;
  /** Indica si tiene calificaciones */
  hasRatings: boolean;
  /** Indica si está cargando */
  loading: boolean;
  /** Error si ocurrió alguno */
  error: string | null;
  /** Función para recargar los datos */
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener las estadísticas globales de calificación de un curso
 * (promedio de todos los estudiantes)
 * 
 * @param courseId - ID del curso
 * @returns Objeto con estadísticas de calificación, estado de carga y error
 * 
 * @example
 * ```tsx
 * // En cualquier componente
 * const { averageRating, reviewsCount, hasRatings, loading } = useCourseRatingStats(courseId);
 * 
 * if (loading) return <Spinner />;
 * 
 * return (
 *   <div>
 *     {hasRatings ? (
 *       <>
 *         <StarIcon filled />
 *         <span>{averageRating.toFixed(1)}</span>
 *         <span>({reviewsCount} reseñas)</span>
 *       </>
 *     ) : (
 *       <span>Sin calificaciones aún</span>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useCourseRatingStats(
  courseId: string | undefined | null
): UseCourseRatingStatsResult {
  const [data, setData] = useState<CourseRatingStatsData>({
    averageRating: 0,
    reviewsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!courseId) {
      setData({ averageRating: 0, reviewsCount: 0 });
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Usamos el endpoint de rating con un userId dummy para obtener solo las stats
      // El endpoint devuelve courseStats incluso sin userId válido
      const response = await fetch(
        `/api/student/rating?courseId=${courseId}&userId=stats-only`
      );

      if (!response.ok) {
        throw new Error("Error al obtener las estadísticas de calificación");
      }

      const result = await response.json();
      
      setData({
        averageRating: result.courseStats?.average_rating ?? 0,
        reviewsCount: result.courseStats?.reviews_count ?? 0,
      });
    } catch (err) {
      console.error("[useCourseRatingStats] Error:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setData({ averageRating: 0, reviewsCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data,
    averageRating: data.averageRating,
    reviewsCount: data.reviewsCount,
    hasRatings: data.reviewsCount > 0,
    loading,
    error,
    refetch: fetchStats,
  };
}

export default useCourseRatingStats;

