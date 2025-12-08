/**
 * Hooks relacionados con cursos
 * 
 * Este módulo exporta hooks reutilizables para obtener información
 * de cursos en cualquier componente de la aplicación.
 * 
 * @example
 * ```tsx
 * import { 
 *   useCourseProgress, 
 *   useStudentCourseRating, 
 *   useCourseRatingStats 
 * } from "@/hooks/course";
 * ```
 */

export { useCourseProgress } from "../useCourseProgress";
export type { 
  CourseProgressData, 
  UseCourseProgressResult 
} from "../useCourseProgress";

export { useStudentCourseRating } from "../useStudentCourseRating";
export type { 
  StudentCourseRatingData, 
  UseStudentCourseRatingResult 
} from "../useStudentCourseRating";

export { useCourseRatingStats } from "../useCourseRatingStats";
export type { 
  CourseRatingStatsData, 
  UseCourseRatingStatsResult 
} from "../useCourseRatingStats";

