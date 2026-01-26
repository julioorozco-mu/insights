"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Activity, Clock3, Users, BookOpenCheck, BookOpen, GraduationCap } from "lucide-react";
import { CourseCard } from "@/components/dashboard/course-card";
import { CourseListItem } from "@/components/dashboard/course-list-item";
import { ScheduleCard } from "@/components/dashboard/schedule-card";
import { ProductivityChart } from "@/components/dashboard/productivity-chart";
import { useAuth } from "@/hooks/useAuth";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { lessonRepository, LessonData } from "@/lib/repositories/lessonRepository";
import { Course } from "@/types/course";

// Tipos para datos dinámicos
interface EnrollmentData {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
  progress: number;
  completedLessons: string[];
}

interface EnrolledCourseData {
  course: Course;
  enrollment: EnrollmentData;
  lessonsCount: number;
  completedLessonsCount: number;
  progressPercent: number; // Progreso real del curso (0-100)
  studyTimeMinutes: number; // Tiempo de estudio en minutos
}

interface RecommendedCourse {
  level: "Introductorio" | "Intermedio" | "Avanzado";
  title: string;
  description: string;
  students: number;
  lessons: number;
  rating: number;
  reviewsCount: number;
  mentor: string;
  thumbnail: string;
  courseId: string;
}

interface ScheduleItem {
  type: string;
  title: string;
  date: string;
  time: string;
  courseId?: string;
  lessonId?: string;
}

interface StatItem {
  label: string;
  value: string;
  delta: string;
  icon: React.ElementType;
  accent: string;
  deltaColor: string;
}

// Función para mapear difficulty a level display en español
function mapDifficultyToLevel(difficulty?: string): "Introductorio" | "Intermedio" | "Avanzado" {
  switch (difficulty) {
    case "beginner": return "Introductorio";
    case "intermediate": return "Intermedio";
    case "advanced": return "Avanzado";
    default: return "Introductorio";
  }
}

// Función para limpiar HTML y truncar descripción
function cleanDescription(html: string | undefined | null, maxLength: number = 100): string {
  if (!html) return "Sin descripción disponible";

  // Remover tags HTML
  let text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  // Truncar si es muy largo
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + "...";
  }

  return text || "Sin descripción disponible";
}

// Función para obtener conteo de estudiantes de un curso
async function getStudentCount(courseId: string): Promise<number> {
  try {
    const response = await fetch(`/api/student/getCourseStudentCount?courseId=${courseId}`);
    if (response.ok) {
      const data = await response.json();
      return data.count || 0;
    }
  } catch {
    // Silently fail
  }
  return 0;
}

// Función para obtener el rating promedio de un curso
async function getCourseRating(courseId: string): Promise<{ averageRating: number; reviewsCount: number }> {
  try {
    // Usamos un userId ficticio solo para obtener las stats del curso
    const response = await fetch(`/api/student/rating?courseId=${courseId}&userId=stats-only`);
    if (response.ok) {
      const data = await response.json();
      return {
        averageRating: data.courseStats?.average_rating || 0,
        reviewsCount: data.courseStats?.reviews_count || 0,
      };
    }
  } catch {
    // Silently fail
  }
  return { averageRating: 0, reviewsCount: 0 };
}

// Función para obtener el progreso real de un estudiante en un curso
async function getCourseProgress(courseId: string, userId: string): Promise<{
  progress: number;
  completedLessons: string[];
  totalLessons: number;
}> {
  try {
    const response = await fetch(`/api/student/progress?courseId=${courseId}&userId=${userId}`);
    if (response.ok) {
      const data = await response.json();
      return {
        progress: data.progress || 0,
        completedLessons: data.completedLessons || [],
        totalLessons: data.totalLessons || 0,
      };
    }
  } catch {
    // Silently fail
  }
  return { progress: 0, completedLessons: [], totalLessons: 0 };
}


export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Estados para datos dinámicos
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseData[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<RecommendedCourse[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadingFavorite, setLoadingFavorite] = useState<string | null>(null);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [productivityData, setProductivityData] = useState<{ day: string; clases: number; autoestudio: number; tareas: number }[]>([]);
  const [calendarData, setCalendarData] = useState<{
    weeks: (number | null)[][];
    month: string;
    year: number;
    eventDays: Set<number>;
    lessonsPerDay: Record<number, { lessons: { title: string; courseName: string }[] }>;
  }>({
    weeks: [],
    month: "",
    year: new Date().getFullYear(),
    eventDays: new Set(),
    lessonsPerDay: {},
  });

  // Función para cargar favoritos
  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/student/favorites?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const favIds = new Set<string>((data.favorites || []).map((f: any) => f.course_id));
        setFavorites(favIds);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  }, [user]);

  // Función para toggle de favorito
  const handleToggleFavorite = useCallback(async (courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || loadingFavorite) return;

    setLoadingFavorite(courseId);
    try {
      if (favorites.has(courseId)) {
        const response = await fetch(
          `/api/student/favorites?courseId=${courseId}&userId=${user.id}`,
          { method: 'DELETE' }
        );
        if (response.ok) {
          setFavorites(prev => {
            const newSet = new Set(prev);
            newSet.delete(courseId);
            return newSet;
          });
        }
      } else {
        const response = await fetch('/api/student/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, userId: user.id }),
        });
        if (response.ok) {
          setFavorites(prev => new Set([...prev, courseId]));
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoadingFavorite(null);
    }
  }, [user, loadingFavorite, favorites]);

  // Cargar datos del estudiante
  const loadStudentData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Resetear todos los estados antes de cargar nuevos datos
    setEnrolledCourses([]);
    setRecommendedCourses([]);
    setScheduleItems([]);
    setStats([]);
    setProductivityData([]);

    try {
      // 1. Obtener inscripciones del estudiante
      console.log("[Dashboard] Cargando enrollments para usuario:", user.id, user.email);
      const enrollmentsRes = await fetch(`/api/student/getEnrollments`);
      let enrollments: EnrollmentData[] = [];

      if (enrollmentsRes.ok) {
        const enrollmentsData = await enrollmentsRes.json();
        enrollments = enrollmentsData.enrollments || [];
        console.log("[Dashboard] Enrollments obtenidos:", enrollments.length, enrollments);
      } else {
        console.log("[Dashboard] Error al obtener enrollments:", enrollmentsRes.status);
      }

      // 2. Cargar cursos inscritos con detalles y progreso real
      const enrolledCoursesData: EnrolledCourseData[] = [];
      const enrolledTags: string[] = [];
      const enrolledCourseIds: string[] = [];

      for (const enrollment of enrollments) {
        const course = await courseRepository.findById(enrollment.courseId);
        if (course) {
          // Obtener el progreso real del curso desde la API
          const courseProgress = await getCourseProgress(course.id, user.id);

          // Obtener lecciones para calcular tiempo de estudio
          const lessons = await lessonRepository.findByCourseId(course.id);
          const activeLessons = lessons.filter(l => l.isActive !== false);

          // Usar lessonIds como fallback para el conteo
          let lessonsCount = courseProgress.totalLessons;
          if (lessonsCount === 0) {
            lessonsCount = activeLessons.length > 0
              ? activeLessons.length
              : (course.lessonIds?.length || 0);
          }

          // Calcular tiempo de estudio basándose en las lecciones completadas
          let studyTimeMinutes = 0;
          const completedLessonIds = new Set(courseProgress.completedLessons);

          for (const lesson of activeLessons) {
            if (completedLessonIds.has(lesson.id)) {
              // Usar la duración real de la lección (durationMinutes) o estimar basándose en subsecciones
              if (lesson.durationMinutes && lesson.durationMinutes > 0) {
                studyTimeMinutes += lesson.durationMinutes;
              } else {
                // Parsear subsecciones del contenido JSON de la lección
                let subsectionsDuration = 0;
                let subsectionsCount = 0;
                try {
                  if (lesson.content) {
                    const contentData = JSON.parse(lesson.content as string);
                    if (contentData.subsections && Array.isArray(contentData.subsections)) {
                      subsectionsCount = contentData.subsections.length;
                      for (const subsection of contentData.subsections) {
                        // Usar duración de subsección si existe, si no usar 5 min por defecto
                        subsectionsDuration += subsection.durationMinutes || 5;
                      }
                    }
                  }
                } catch {
                  // Si falla el parse, usar fallback
                }

                if (subsectionsDuration > 0) {
                  studyTimeMinutes += subsectionsDuration;
                } else if (subsectionsCount > 0) {
                  // Si hay subsecciones pero sin duración, usar 5 min por cada una
                  studyTimeMinutes += subsectionsCount * 5;
                } else {
                  // Fallback: 15 minutos por lección sin información (valor más realista)
                  studyTimeMinutes += 15;
                }
              }
            }
          }

          enrolledCoursesData.push({
            course,
            enrollment,
            lessonsCount,
            completedLessonsCount: courseProgress.completedLessons.length,
            progressPercent: courseProgress.progress,
            studyTimeMinutes,
          });

          // Recolectar tags para recomendaciones
          if (course.tags) {
            enrolledTags.push(...course.tags);
          }
          enrolledCourseIds.push(course.id);
        }
      }

      console.log("[Dashboard] Cursos inscritos:", enrolledCoursesData.length, "cursos");
      setEnrolledCourses(enrolledCoursesData);

      // 3. Cargar cursos recomendados (priorizando mejor calificación, luego más recientes)
      const allCourses = await courseRepository.findPublished();
      const availableCourses = allCourses.filter(c => !enrolledCourseIds.includes(c.id));

      // Obtener rating de todos los cursos disponibles
      const coursesWithRatings = await Promise.all(
        availableCourses.map(async (course) => {
          const courseRating = await getCourseRating(course.id);
          return {
            course,
            averageRating: courseRating.averageRating,
            reviewsCount: courseRating.reviewsCount,
          };
        })
      );

      // Separar cursos con calificación de los que no tienen
      const coursesWithRating = coursesWithRatings
        .filter(c => c.averageRating > 0)
        .sort((a, b) => b.averageRating - a.averageRating); // Mayor rating primero

      const coursesWithoutRating = coursesWithRatings
        .filter(c => c.averageRating === 0)
        .sort((a, b) => {
          // Ordenar por fecha de creación (más recientes primero)
          const dateA = new Date(a.course.createdAt || 0);
          const dateB = new Date(b.course.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

      // Combinar: primero los mejor calificados, luego los más recientes sin calificación
      const sortedCourses = [...coursesWithRating, ...coursesWithoutRating].slice(0, 4);

      // Convertir a formato de RecommendedCourse
      const recommendedWithDetails: RecommendedCourse[] = await Promise.all(
        sortedCourses.map(async ({ course, averageRating, reviewsCount }) => {
          const lessons = await lessonRepository.findByCourseId(course.id);
          const activeLessons = lessons.filter(l => l.isActive !== false);
          const studentCount = await getStudentCount(course.id);

          // Usar lessonIds como fallback
          const lessonsCount = activeLessons.length > 0
            ? activeLessons.length
            : (course.lessonIds?.length || 0);

          return {
            level: mapDifficultyToLevel(course.difficulty),
            title: course.title,
            description: cleanDescription(course.description),
            students: studentCount,
            lessons: lessonsCount,
            rating: averageRating,
            reviewsCount: reviewsCount,
            mentor: "Instructor",
            thumbnail: course.thumbnailUrl || course.coverImageUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
            courseId: course.id,
          };
        })
      );

      setRecommendedCourses(recommendedWithDetails);

      // 4. Cargar próximas lecciones para el schedule y calendario
      const upcomingLessons: { lesson: LessonData; courseName: string }[] = [];
      const now = new Date();

      for (const enrolledCourse of enrolledCoursesData) {
        const lessons = await lessonRepository.findByCourseId(enrolledCourse.course.id);
        for (const lesson of lessons) {
          if (lesson.startDate || lesson.scheduledStartTime) {
            const lessonDate = new Date(lesson.startDate || lesson.scheduledStartTime || "");
            if (lessonDate >= now) {
              upcomingLessons.push({ lesson, courseName: enrolledCourse.course.title });
            }
          }
        }
      }

      // Ordenar por fecha
      upcomingLessons.sort((a, b) => {
        const dateA = new Date(a.lesson.startDate || a.lesson.scheduledStartTime || "");
        const dateB = new Date(b.lesson.startDate || b.lesson.scheduledStartTime || "");
        return dateA.getTime() - dateB.getTime();
      });

      // Crear items de schedule (próximas 2 lecciones)
      const scheduleData: ScheduleItem[] = upcomingLessons.slice(0, 2).map(({ lesson, courseName }) => {
        const lessonDate = new Date(lesson.startDate || lesson.scheduledStartTime || "");
        const endTime = lesson.durationMinutes
          ? new Date(lessonDate.getTime() + lesson.durationMinutes * 60000)
          : new Date(lessonDate.getTime() + 60 * 60000);

        return {
          type: lesson.type === "livestream" ? "En Vivo" : "Lección",
          title: `${courseName}: ${lesson.title}`,
          date: lessonDate.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' }),
          time: `${lessonDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
          courseId: lesson.courseId,
          lessonId: lesson.id,
        };
      });

      setScheduleItems(scheduleData);

      // 5. Construir datos del calendario
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);

      // Calcular semanas del calendario
      const weeks: (number | null)[][] = [];
      let currentWeek: (number | null)[] = [];

      // Agregar días vacíos al inicio (lunes = 0)
      const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Convertir domingo=0 a lunes=0
      for (let i = 0; i < startDayOfWeek; i++) {
        currentWeek.push(null);
      }

      // Agregar días del mes
      for (let day = 1; day <= lastDay.getDate(); day++) {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }

      // Completar última semana
      while (currentWeek.length > 0 && currentWeek.length < 7) {
        currentWeek.push(null);
      }
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }

      // Identificar días con eventos
      const eventDaysSet = new Set<number>();
      const lessonsPerDayMap: Record<number, { lessons: { title: string; courseName: string }[] }> = {};

      for (const { lesson, courseName } of upcomingLessons) {
        const lessonDate = new Date(lesson.startDate || lesson.scheduledStartTime || "");
        if (lessonDate.getMonth() === currentMonth && lessonDate.getFullYear() === currentYear) {
          const dayNum = lessonDate.getDate();
          eventDaysSet.add(dayNum);

          if (!lessonsPerDayMap[dayNum]) {
            lessonsPerDayMap[dayNum] = { lessons: [] };
          }
          lessonsPerDayMap[dayNum].lessons.push({ title: lesson.title, courseName });
        }
      }

      setCalendarData({
        weeks,
        month: now.toLocaleDateString('es-ES', { month: 'long' }),
        year: currentYear,
        eventDays: eventDaysSet,
        lessonsPerDay: lessonsPerDayMap,
      });

      // Seleccionar el día actual por defecto
      setSelectedDay(now.getDate());

      // 6. Calcular estadísticas para estudiante
      const totalEnrolled = enrolledCoursesData.length;

      // Cursos completados: aquellos con progreso = 100%
      const completedCourses = enrolledCoursesData.filter(e => e.progressPercent >= 100).length;

      // Calcular totales de lecciones para productividad
      const totalCompletedLessons = enrolledCoursesData.reduce((sum, e) => sum + e.completedLessonsCount, 0);
      const totalLessons = enrolledCoursesData.reduce((sum, e) => sum + e.lessonsCount, 0);

      // Progreso general: promedio del progreso de todos los cursos
      const totalProgressSum = enrolledCoursesData.reduce((sum, e) => sum + e.progressPercent, 0);
      const progressPercentage = totalEnrolled > 0 ? Math.round(totalProgressSum / totalEnrolled) : 0;

      // Tiempo total de estudio en minutos (suma de todos los cursos)
      const totalStudyMinutes = enrolledCoursesData.reduce((sum, e) => sum + e.studyTimeMinutes, 0);

      // Formatear tiempo de estudio
      let studyTimeDisplay: string;
      if (totalStudyMinutes === 0) {
        studyTimeDisplay = "0 min";
      } else if (totalStudyMinutes < 60) {
        studyTimeDisplay = `${totalStudyMinutes} min`;
      } else {
        const hours = Math.floor(totalStudyMinutes / 60);
        const minutes = totalStudyMinutes % 60;
        studyTimeDisplay = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      }

      const studentStats: StatItem[] = [
        {
          label: "Progreso General",
          value: `${progressPercentage}%`,
          delta: progressPercentage > 50 ? `+${progressPercentage - 50}%` : "",
          icon: Activity,
          accent: "bg-brand-primary/10 text-brand-primary",
          deltaColor: progressPercentage > 50 ? "text-brand-success" : "text-slate-400",
        },
        {
          label: "Cursos Completados",
          value: `${completedCourses}`,
          delta: completedCourses > 0 ? "¡Bien!" : "",
          icon: BookOpenCheck,
          accent: "bg-brand-secondary/10 text-brand-secondary",
          deltaColor: "text-brand-success",
        },
        {
          label: "Cursos En Progreso",
          value: `${totalEnrolled - completedCourses}`,
          delta: "",
          icon: BookOpen,
          accent: "bg-brand-primary/10 text-brand-primary",
          deltaColor: "text-slate-400",
        },
        {
          label: "Tiempo Estudiado",
          value: studyTimeDisplay,
          delta: totalStudyMinutes > 0 ? "aprox." : "",
          icon: Clock3,
          accent: "bg-brand-secondary/10 text-brand-secondary",
          deltaColor: "text-slate-400",
        },
      ];

      setStats(studentStats);

      // 7. Calcular datos de productividad basados en el progreso real
      const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      const weekProductivity = days.map((day) => {
        // Si no hay cursos inscritos, todos los valores son 0
        if (totalEnrolled === 0) {
          return { day, clases: 0, autoestudio: 0, tareas: 0 };
        }

        // Calcular porcentajes basados en el progreso real
        // Clases: % de lecciones vistas
        const clasesPercent = totalLessons > 0 ? Math.round((totalCompletedLessons / totalLessons) * 100) : 0;
        // Autoestudio: basado en el progreso general
        const autoestudioPercent = progressPercentage;
        // Tareas: basado en cursos completados
        const tareasPercent = totalEnrolled > 0 ? Math.round((completedCourses / totalEnrolled) * 100) : 0;

        return {
          day,
          clases: clasesPercent,
          autoestudio: autoestudioPercent,
          tareas: tareasPercent,
        };
      });

      setProductivityData(weekProductivity);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Cargar datos del profesor
  const loadTeacherData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Resetear todos los estados antes de cargar nuevos datos
    setEnrolledCourses([]);
    setRecommendedCourses([]);
    setScheduleItems([]);
    setStats([]);
    setProductivityData([]);

    try {
      // 1. Obtener cursos del profesor
      let teacherCourses = await courseRepository.findBySpeaker(user.id);

      if (teacherCourses.length === 0) {
        teacherCourses = await courseRepository.findBySpeakerEmail(user.email);
      }

      // 2. Contar estudiantes totales
      let totalStudents = 0;
      for (const course of teacherCourses) {
        const count = await getStudentCount(course.id);
        totalStudents += count;
      }

      // 3. Cargar próximas lecciones
      const upcomingLessons: { lesson: LessonData; courseName: string }[] = [];
      const now = new Date();

      for (const course of teacherCourses) {
        const lessons = await lessonRepository.findByCourseId(course.id);
        for (const lesson of lessons) {
          if (lesson.startDate || lesson.scheduledStartTime) {
            const lessonDate = new Date(lesson.startDate || lesson.scheduledStartTime || "");
            if (lessonDate >= now) {
              upcomingLessons.push({ lesson, courseName: course.title });
            }
          }
        }
      }

      upcomingLessons.sort((a, b) => {
        const dateA = new Date(a.lesson.startDate || a.lesson.scheduledStartTime || "");
        const dateB = new Date(b.lesson.startDate || b.lesson.scheduledStartTime || "");
        return dateA.getTime() - dateB.getTime();
      });

      // 4. Crear schedule items
      const scheduleData: ScheduleItem[] = upcomingLessons.slice(0, 2).map(({ lesson, courseName }) => {
        const lessonDate = new Date(lesson.startDate || lesson.scheduledStartTime || "");
        const endTime = lesson.durationMinutes
          ? new Date(lessonDate.getTime() + lesson.durationMinutes * 60000)
          : new Date(lessonDate.getTime() + 60 * 60000);

        return {
          type: lesson.type === "livestream" ? "En Vivo" : "Lección",
          title: `${courseName}: ${lesson.title}`,
          date: lessonDate.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' }),
          time: `${lessonDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
          courseId: lesson.courseId,
          lessonId: lesson.id,
        };
      });

      setScheduleItems(scheduleData);

      // 5. Construir calendario
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);

      const weeks: (number | null)[][] = [];
      let currentWeek: (number | null)[] = [];

      const startDayOfWeek = (firstDay.getDay() + 6) % 7;
      for (let i = 0; i < startDayOfWeek; i++) {
        currentWeek.push(null);
      }

      for (let day = 1; day <= lastDay.getDate(); day++) {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }

      while (currentWeek.length > 0 && currentWeek.length < 7) {
        currentWeek.push(null);
      }
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }

      const eventDaysSet = new Set<number>();
      const lessonsPerDayMap: Record<number, { lessons: { title: string; courseName: string }[] }> = {};

      for (const { lesson, courseName } of upcomingLessons) {
        const lessonDate = new Date(lesson.startDate || lesson.scheduledStartTime || "");
        if (lessonDate.getMonth() === currentMonth && lessonDate.getFullYear() === currentYear) {
          const dayNum = lessonDate.getDate();
          eventDaysSet.add(dayNum);

          if (!lessonsPerDayMap[dayNum]) {
            lessonsPerDayMap[dayNum] = { lessons: [] };
          }
          lessonsPerDayMap[dayNum].lessons.push({ title: lesson.title, courseName });
        }
      }

      setCalendarData({
        weeks,
        month: now.toLocaleDateString('es-ES', { month: 'long' }),
        year: currentYear,
        eventDays: eventDaysSet,
        lessonsPerDay: lessonsPerDayMap,
      });

      setSelectedDay(now.getDate());

      // 6. Cargar cursos recomendados (priorizando mejor calificación, luego más recientes)
      const allCourses = await courseRepository.findPublished();
      const otherCourses = allCourses.filter(c => !teacherCourses.some(tc => tc.id === c.id));

      // Obtener rating de todos los cursos disponibles
      const coursesWithRatings = await Promise.all(
        otherCourses.map(async (course) => {
          const courseRating = await getCourseRating(course.id);
          return {
            course,
            averageRating: courseRating.averageRating,
            reviewsCount: courseRating.reviewsCount,
          };
        })
      );

      // Separar cursos con calificación de los que no tienen
      const coursesWithRating = coursesWithRatings
        .filter(c => c.averageRating > 0)
        .sort((a, b) => b.averageRating - a.averageRating); // Mayor rating primero

      const coursesWithoutRating = coursesWithRatings
        .filter(c => c.averageRating === 0)
        .sort((a, b) => {
          // Ordenar por fecha de creación (más recientes primero)
          const dateA = new Date(a.course.createdAt || 0);
          const dateB = new Date(b.course.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

      // Combinar: primero los mejor calificados, luego los más recientes sin calificación
      const sortedCourses = [...coursesWithRating, ...coursesWithoutRating].slice(0, 4);

      const recommendedWithDetails: RecommendedCourse[] = await Promise.all(
        sortedCourses.map(async ({ course, averageRating, reviewsCount }) => {
          const lessons = await lessonRepository.findByCourseId(course.id);
          const activeLessons = lessons.filter(l => l.isActive !== false);
          const studentCount = await getStudentCount(course.id);

          // Usar lessonIds como fallback
          const lessonsCount = activeLessons.length > 0
            ? activeLessons.length
            : (course.lessonIds?.length || 0);

          return {
            level: mapDifficultyToLevel(course.difficulty),
            title: course.title,
            description: cleanDescription(course.description),
            students: studentCount,
            lessons: lessonsCount,
            rating: averageRating,
            reviewsCount: reviewsCount,
            mentor: "Instructor",
            thumbnail: course.thumbnailUrl || course.coverImageUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
            courseId: course.id,
          };
        })
      );

      setRecommendedCourses(recommendedWithDetails);

      // 7. Convertir cursos del profesor a formato de enrolled para mostrar en "Mis Cursos"
      const teacherCoursesData: EnrolledCourseData[] = await Promise.all(
        teacherCourses.map(async (course) => {
          const lessons = await lessonRepository.findByCourseId(course.id);
          const activeLessons = lessons.filter(l => l.isActive !== false);

          // Usar lessonIds como fallback
          const lessonsCount = activeLessons.length > 0
            ? activeLessons.length
            : (course.lessonIds?.length || 0);

          return {
            course,
            enrollment: {
              id: course.id,
              courseId: course.id,
              studentId: user.id,
              enrolledAt: course.createdAt,
              progress: 100,
              completedLessons: [],
            },
            lessonsCount: lessonsCount,
            completedLessonsCount: lessonsCount,
            progressPercent: 100,
            studyTimeMinutes: 0,
          };
        })
      );

      setEnrolledCourses(teacherCoursesData);

      // 8. Estadísticas para profesor
      const totalLessons = teacherCoursesData.reduce((sum, e) => sum + e.lessonsCount, 0);

      const teacherStats: StatItem[] = [
        {
          label: "Total Estudiantes",
          value: `${totalStudents}`,
          delta: totalStudents > 0 ? "activos" : "",
          icon: Users,
          accent: "bg-brand-primary/10 text-brand-primary",
          deltaColor: "text-brand-success",
        },
        {
          label: "Mis Cursos",
          value: `${teacherCourses.length}`,
          delta: "",
          icon: BookOpenCheck,
          accent: "bg-brand-secondary/10 text-brand-secondary",
          deltaColor: "text-brand-success",
        },
        {
          label: "Total Lecciones",
          value: `${totalLessons}`,
          delta: "",
          icon: GraduationCap,
          accent: "bg-brand-primary/10 text-brand-primary",
          deltaColor: "text-slate-400",
        },
        {
          label: "Próximas Clases",
          value: `${upcomingLessons.length}`,
          delta: upcomingLessons.length > 0 ? "programadas" : "",
          icon: Clock3,
          accent: "bg-brand-secondary/10 text-brand-secondary",
          deltaColor: "text-brand-success",
        },
      ];

      setStats(teacherStats);

      // 9. Calcular datos de productividad para profesor
      const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      const weekProductivity = days.map((day) => {
        if (teacherCourses.length === 0) {
          return { day, clases: 0, autoestudio: 0, tareas: 0 };
        }

        // Para profesores: basado en sus cursos y estudiantes
        const clasesPercent = totalLessons > 0 ? Math.min(100, Math.round((totalLessons / teacherCourses.length) * 10)) : 0;
        const estudiantesPercent = totalStudents > 0 ? Math.min(100, totalStudents * 5) : 0;
        const cursosPercent = teacherCourses.length > 0 ? Math.min(100, teacherCourses.length * 20) : 0;

        return {
          day,
          clases: clasesPercent,
          autoestudio: estudiantesPercent,
          tareas: cursosPercent,
        };
      });

      setProductivityData(weekProductivity);

    } catch (error) {
      console.error("Error loading teacher dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Efecto para cargar datos según el rol
  useEffect(() => {
    if (!user) return;

    // Si el usuario cambió, resetear todo y recargar
    if (currentUserId !== user.id) {
      console.log("[Dashboard] Usuario cambió o primera carga:", user.email, user.role);
      setDataLoaded(false);
      setCurrentUserId(user.id);
      // Resetear estados inmediatamente
      setEnrolledCourses([]);
      setRecommendedCourses([]);
      setScheduleItems([]);
      setStats([]);
      setProductivityData([]);
    }

    // Si ya cargamos datos para este usuario, no recargar
    if (dataLoaded && currentUserId === user.id) {
      setLoading(false);
      return;
    }

    // Cargar datos
    const loadData = async () => {
      if (user.role === "teacher") {
        await loadTeacherData();
      } else if (user.role === "student") {
        await loadStudentData();
        await fetchFavorites();
      } else {
        // Para admin, superadmin, support - no cargar enrollments de estudiante
        // Solo mostrar estadísticas generales o redirigir a panel específico
        setLoading(false);
      }
      setDataLoaded(true);
    };

    loadData();
  }, [user, currentUserId, dataLoaded, loadStudentData, loadTeacherData, fetchFavorites]);

  // Get current date info
  const now = new Date();
  const weekday = now.toLocaleDateString('es-ES', { weekday: 'long' });
  const fullDate = now.toLocaleDateString('es-ES', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Obtener lecciones del día seleccionado
  const selectedDayLessons = selectedDay ? calendarData.lessonsPerDay[selectedDay]?.lessons || [] : [];

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 space-y-8">
            {/* Skeleton for recommended courses */}
            <section>
              <div className="mb-4 h-7 w-64 animate-pulse rounded bg-slate-200" />
              <div className="grid gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
            </section>
            {/* Skeleton for my courses */}
            <section>
              <div className="mb-4 h-7 w-32 animate-pulse rounded bg-slate-200" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
            </section>
          </div>
          <div className="w-full space-y-6 lg:max-w-sm">
            <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-32 animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Main Content - Two Columns */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left Column - Main Content */}
        <div className="flex-1 space-y-8">
          {/* Top Courses Section - Recommended */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Cursos recomendados para ti</h2>
              <Link href="/dashboard/available-courses" className="text-sm font-medium text-brand-secondary hover:underline">
                Ver todos
              </Link>
            </div>
            {recommendedCourses.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {recommendedCourses.map((course, idx) => (
                  <Link key={course.courseId} href={`/dashboard/available-courses`} className="block h-full">
                    <CourseCard
                      {...course}
                      priority={idx === 0}
                      courseId={course.courseId}
                      isFavorite={favorites.has(course.courseId)}
                      loadingFavorite={loadingFavorite === course.courseId}
                      onToggleFavorite={(e) => handleToggleFavorite(course.courseId, e)}
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-2 text-slate-500">No hay cursos recomendados disponibles</p>
                <Link
                  href="/dashboard/available-courses"
                  className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
                >
                  Explorar cursos
                </Link>
              </div>
            )}
          </section>

          {/* My Courses Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {user?.role === "teacher" ? "Mis Cursos (Instructor)" : "Mis Cursos"}
              </h2>
              <Link
                href={user?.role === "teacher" ? "/dashboard/my-courses" : "/dashboard/enrolled-courses"}
                className="text-sm font-medium text-brand-secondary hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {enrolledCourses.length > 0 ? (
              <div className="space-y-4">
                {enrolledCourses.slice(0, 4).map((item) => (
                  <Link
                    key={item.course.id}
                    href={
                      user?.role === "teacher"
                        ? `/dashboard/my-courses/${item.course.id}/edit`
                        : `/dashboard/student/courses/${item.course.id}`
                    }
                  >
                    <CourseListItem
                      title={item.course.title}
                      sessions={`${item.completedLessonsCount}/${item.lessonsCount}`}
                      thumbnail={
                        item.course.thumbnailUrl ||
                        item.course.coverImageUrl ||
                        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80"
                      }
                      avatars={[]}
                      highlight={
                        item.completedLessonsCount > 0 && item.completedLessonsCount < item.lessonsCount
                          ? "En progreso"
                          : item.completedLessonsCount >= item.lessonsCount && item.lessonsCount > 0
                            ? "Completado"
                            : undefined
                      }
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-2 text-slate-500">
                  {user?.role === "teacher"
                    ? "Aún no has creado ningún curso"
                    : "Aún no estás inscrito en ningún curso"}
                </p>
                <Link
                  href={user?.role === "teacher" ? "/dashboard/my-courses/new" : "/dashboard/available-courses"}
                  className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
                >
                  {user?.role === "teacher" ? "Crear curso" : "Explorar cursos"}
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="w-full space-y-6 lg:max-w-sm">
          {/* Calendar Widget */}
          <section className="rounded-3xl bg-white p-5 shadow-card-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 capitalize">{weekday}</p>
                <p className="text-xl font-semibold text-slate-900 capitalize">{fullDate}</p>
              </div>
              {/* Info del día seleccionado */}
              {selectedDayLessons.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary/10 text-brand-secondary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {selectedDayLessons.length} {selectedDayLessons.length === 1 ? "clase" : "clases"}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic">Sin clases</div>
              )}
            </div>
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span className="capitalize">{calendarData.month} {calendarData.year}</span>
                <div className="flex gap-2 text-slate-400">
                  <button className="rounded-full border border-slate-200 p-1" disabled>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="rounded-full border border-slate-200 p-1" disabled>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-slate-400">
                {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm">
                {calendarData.weeks.flatMap((week, rowIndex) =>
                  week.map((day, columnIndex) => {
                    if (!day) {
                      return <span key={`${rowIndex}-${columnIndex}`} className="h-9 w-9" />;
                    }

                    const isSelected = day === selectedDay;
                    const hasEvent = calendarData.eventDays.has(day);
                    const isToday = day === now.getDate();

                    return (
                      <button
                        key={`${rowIndex}-${columnIndex}-${day}`}
                        onClick={() => setSelectedDay(day)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${isSelected
                            ? "bg-brand-secondary text-white"
                            : isToday
                              ? "bg-brand-primary/10 text-brand-primary"
                              : hasEvent
                                ? "text-slate-700 hover:bg-brand-secondary/10"
                                : "text-slate-700 hover:bg-slate-100"
                          }`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{day}</span>
                          {hasEvent && (
                            <span
                              className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-brand-secondary"
                                }`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
            {/* Lista de lecciones del día seleccionado */}
            {selectedDayLessons.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Clases del día</p>
                <div className="space-y-2">
                  {selectedDayLessons.map((lesson, idx) => (
                    <div key={idx} className="rounded-lg bg-slate-50 p-2">
                      <p className="text-sm font-medium text-slate-900">{lesson.title}</p>
                      <p className="text-xs text-slate-500">{lesson.courseName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Schedule Cards */}
          <section className="space-y-3">
            {scheduleItems.length > 0 ? (
              scheduleItems.map((item) => (
                <ScheduleCard key={`${item.courseId}-${item.lessonId}`} {...item} />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center">
                <Clock3 className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-500">No hay clases programadas próximamente</p>
              </div>
            )}
          </section>

          {/* Overall Information */}
          <section className="rounded-3xl bg-white p-5 shadow-card-soft">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Información General</h3>
              <button className="text-sm font-medium text-brand-secondary">Ver todo</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${stat.accent}`}>
                      <stat.icon className="h-4 w-4" />
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
                    <span className={`text-xs font-semibold ${stat.deltaColor}`}>{stat.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Productivity Chart */}
          <section className="rounded-3xl bg-white p-5 shadow-card-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Progreso Semanal</h3>
                <p className="text-sm text-slate-500">Tu actividad de estudio</p>
              </div>
            </div>
            <ProductivityChart data={productivityData} />
          </section>
        </div>
      </div>
    </div>
  );
}
