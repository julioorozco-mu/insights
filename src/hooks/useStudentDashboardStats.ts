"use client";

import { useState, useEffect, useCallback } from "react";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { lessonRepository } from "@/lib/repositories/lessonRepository";

/**
 * Datos agregados de un curso para el dashboard
 */
export interface CourseStats {
  courseId: string;
  courseTitle: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  studyTimeMinutes: number;
}

/**
 * Estadísticas agregadas del dashboard del estudiante
 */
export interface DashboardStats {
  /** Total de cursos inscritos */
  totalEnrolled: number;
  /** Cursos completados (100%) */
  completedCourses: number;
  /** Cursos en progreso */
  coursesInProgress: number;
  /** Progreso general (promedio de todos los cursos) */
  overallProgress: number;
  /** Total de lecciones completadas */
  totalCompletedLessons: number;
  /** Total de lecciones */
  totalLessons: number;
  /** Tiempo total de estudio en minutos */
  totalStudyMinutes: number;
  /** Datos por curso */
  courses: CourseStats[];
}

/**
 * Resultado del hook useStudentDashboardStats
 */
export interface UseStudentDashboardStatsResult {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener las estadísticas agregadas del dashboard del estudiante
 * Usa los mismos endpoints que useCourseProgress pero para múltiples cursos
 */
export function useStudentDashboardStats(
  userId: string | undefined | null,
  enrolledCourseIds: string[]
): UseStudentDashboardStatsResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!userId || enrolledCourseIds.length === 0) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Obtener progreso de cada curso en paralelo
      const progressPromises = enrolledCourseIds.map(async (courseId) => {
        try {
          const response = await fetch(
            `/api/student/progress?courseId=${courseId}&userId=${userId}`
          );
          if (response.ok) {
            return await response.json();
          }
        } catch {
          // Ignorar errores individuales
        }
        return { progress: 0, completedLessons: [], totalLessons: 0 };
      });

      // Obtener información de cursos
      const coursePromises = enrolledCourseIds.map(async (courseId) => {
        const course = await courseRepository.findById(courseId);
        const lessons = await lessonRepository.findByCourseId(courseId);
        const activeLessons = lessons.filter(l => l.isActive !== false);
        return { course, lessons: activeLessons };
      });

      const [progressResults, courseResults] = await Promise.all([
        Promise.all(progressPromises),
        Promise.all(coursePromises),
      ]);

      // Calcular estadísticas
      const courses: CourseStats[] = [];
      let totalCompletedLessons = 0;
      let totalLessons = 0;
      let totalProgressSum = 0;
      let completedCourses = 0;
      let totalStudyMinutes = 0;

      for (let i = 0; i < enrolledCourseIds.length; i++) {
        const courseId = enrolledCourseIds[i];
        const progressData = progressResults[i];
        const courseData = courseResults[i];
        
        if (!courseData.course) continue;

        const progress = progressData.progress || 0;
        const completedLessonIds = new Set(progressData.completedLessons || []);
        const lessonsCount = progressData.totalLessons || courseData.lessons.length;

        // Calcular tiempo de estudio para lecciones completadas
        let studyTimeMinutes = 0;
        for (const lesson of courseData.lessons) {
          if (completedLessonIds.has(lesson.id)) {
            if (lesson.durationMinutes && lesson.durationMinutes > 0) {
              studyTimeMinutes += lesson.durationMinutes;
            } else {
              // Parsear subsecciones del contenido JSON
              let subsectionsDuration = 0;
              let subsectionsCount = 0;
              try {
                if (lesson.content) {
                  const contentData = JSON.parse(lesson.content as string);
                  if (contentData.subsections && Array.isArray(contentData.subsections)) {
                    subsectionsCount = contentData.subsections.length;
                    for (const subsection of contentData.subsections) {
                      subsectionsDuration += subsection.durationMinutes || 5;
                    }
                  }
                }
              } catch {
                // Fallback
              }
              
              if (subsectionsDuration > 0) {
                studyTimeMinutes += subsectionsDuration;
              } else if (subsectionsCount > 0) {
                studyTimeMinutes += subsectionsCount * 5;
              } else {
                studyTimeMinutes += 15; // Fallback
              }
            }
          }
        }

        courses.push({
          courseId,
          courseTitle: courseData.course.title,
          progress,
          completedLessons: completedLessonIds.size,
          totalLessons: lessonsCount,
          studyTimeMinutes,
        });

        totalCompletedLessons += completedLessonIds.size;
        totalLessons += lessonsCount;
        totalProgressSum += progress;
        totalStudyMinutes += studyTimeMinutes;
        
        if (progress >= 100) {
          completedCourses++;
        }
      }

      const overallProgress = courses.length > 0 
        ? Math.round(totalProgressSum / courses.length) 
        : 0;

      setStats({
        totalEnrolled: courses.length,
        completedCourses,
        coursesInProgress: courses.length - completedCourses,
        overallProgress,
        totalCompletedLessons,
        totalLessons,
        totalStudyMinutes,
        courses,
      });
    } catch (err) {
      console.error("[useStudentDashboardStats] Error:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [userId, enrolledCourseIds]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

export default useStudentDashboardStats;

