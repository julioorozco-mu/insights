import { useState, useEffect, useCallback } from "react";

/**
 * Datos de progreso del curso para un estudiante
 */
export interface CourseProgressData {
  /** Porcentaje de progreso (0-100) */
  progress: number;
  /** IDs de lecciones completadas */
  completedLessons: string[];
  /** Progreso de subsecciones por lección { lessonId: highestCompletedIndex } */
  subsectionProgress: Record<string, number>;
  /** ID de la última lección accedida */
  lastAccessedLessonId: string | null;
  /** Total de lecciones en el curso */
  totalLessons: number;
}

/**
 * Resultado del hook useCourseProgress
 */
export interface UseCourseProgressResult {
  /** Datos de progreso del estudiante */
  data: CourseProgressData | null;
  /** Indica si está cargando */
  loading: boolean;
  /** Error si ocurrió alguno */
  error: string | null;
  /** Función para recargar los datos */
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener el progreso de un estudiante en un curso específico
 * 
 * @param courseId - ID del curso
 * @param userId - ID del estudiante
 * @returns Objeto con datos de progreso, estado de carga y error
 * 
 * @example
 * ```tsx
 * // En cualquier componente
 * const { data, loading, error } = useCourseProgress(courseId, user?.id);
 * 
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * 
 * return (
 *   <div>
 *     <span>Progreso: {data?.progress}%</span>
 *     <span>Lecciones completadas: {data?.completedLessons.length}</span>
 *   </div>
 * );
 * ```
 */
export function useCourseProgress(
  courseId: string | undefined | null,
  userId: string | undefined | null
): UseCourseProgressResult {
  const [data, setData] = useState<CourseProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!courseId || !userId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/student/progress?courseId=${courseId}&userId=${userId}`
      );

      if (!response.ok) {
        throw new Error("Error al obtener el progreso del curso");
      }

      const result = await response.json();
      
      setData({
        progress: result.progress ?? 0,
        completedLessons: result.completedLessons ?? [],
        subsectionProgress: result.subsectionProgress ?? {},
        lastAccessedLessonId: result.lastAccessedLessonId ?? null,
        totalLessons: result.totalLessons ?? 0,
      });
    } catch (err) {
      console.error("[useCourseProgress] Error:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [courseId, userId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    data,
    loading,
    error,
    refetch: fetchProgress,
  };
}

export default useCourseProgress;
