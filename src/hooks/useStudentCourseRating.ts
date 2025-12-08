import { useState, useEffect, useCallback } from "react";

/**
 * Datos de la calificación individual de un estudiante para un curso
 */
export interface StudentCourseRatingData {
  /** ID de la reseña */
  id: string;
  /** ID del curso */
  courseId: string;
  /** ID del estudiante */
  studentId: string;
  /** Calificación (1-5 estrellas) */
  rating: number;
  /** Comentario/reseña opcional */
  comment: string | null;
  /** Fecha de creación */
  createdAt: string;
  /** Fecha de última actualización */
  updatedAt: string;
}

/**
 * Resultado del hook useStudentCourseRating
 */
export interface UseStudentCourseRatingResult {
  /** Datos de la calificación del estudiante (null si no ha calificado) */
  data: StudentCourseRatingData | null;
  /** Indica si el estudiante ya calificó el curso */
  hasRated: boolean;
  /** Calificación del estudiante (0 si no ha calificado) */
  rating: number;
  /** Indica si está cargando */
  loading: boolean;
  /** Error si ocurrió alguno */
  error: string | null;
  /** Función para recargar los datos */
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener la calificación individual de un estudiante para un curso
 * 
 * @param courseId - ID del curso
 * @param userId - ID del estudiante
 * @returns Objeto con datos de calificación, estado de carga y error
 * 
 * @example
 * ```tsx
 * // En cualquier componente
 * const { data, hasRated, rating, loading } = useStudentCourseRating(courseId, user?.id);
 * 
 * if (loading) return <Spinner />;
 * 
 * return (
 *   <div>
 *     {hasRated ? (
 *       <span>Tu calificación: {rating} estrellas</span>
 *     ) : (
 *       <button>Calificar este curso</button>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useStudentCourseRating(
  courseId: string | undefined | null,
  userId: string | undefined | null
): UseStudentCourseRatingResult {
  const [data, setData] = useState<StudentCourseRatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRating = useCallback(async () => {
    if (!courseId || !userId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/student/rating?courseId=${courseId}&userId=${userId}`
      );

      if (!response.ok) {
        throw new Error("Error al obtener la calificación");
      }

      const result = await response.json();
      
      if (result.review) {
        setData({
          id: result.review.id,
          courseId: result.review.course_id,
          studentId: result.review.student_id,
          rating: result.review.rating,
          comment: result.review.comment,
          createdAt: result.review.created_at,
          updatedAt: result.review.updated_at,
        });
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("[useStudentCourseRating] Error:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [courseId, userId]);

  useEffect(() => {
    fetchRating();
  }, [fetchRating]);

  return {
    data,
    hasRated: data !== null,
    rating: data?.rating ?? 0,
    loading,
    error,
    refetch: fetchRating,
  };
}

export default useStudentCourseRating;

