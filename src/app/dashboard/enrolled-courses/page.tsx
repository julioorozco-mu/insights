"use client";

import { useEffect, useState, useCallback, memo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/common/Loader";
import { IconBook, IconStarFilled, IconHeart, IconHeartFilled, IconLock } from "@tabler/icons-react";

interface Speaker {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  avatarUrl?: string;
}

interface LessonProgress {
  id: string;
  title: string;
  totalSubsections: number;
  completedSubsections: number;
  isCompleted: boolean;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  speakerIds?: string[];
  lessonCount: number;
  createdAt: any;
  startDate?: string;
}

interface CourseAccessInfo {
  isMicrocredentialCourse: boolean;
  isLevel2Locked: boolean;
  microcredentialId?: string;
  levelNumber?: 1 | 2;
}

interface CourseProgress {
  progress: number;
  completedLessons: string[];
  subsectionProgress: Record<string, number>;
  totalLessons: number;
  lessons: LessonProgress[];
  lastAccessedLessonId: string | null;
  lastAccessedSubsectionIndex: number;
}

interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: any;
}

interface CourseRating {
  averageRating: number;
  reviewsCount: number;
}

// Componente memoizado para renderizar estrellas (rerender-memo)
const StarRating = memo(({ rating, reviewsCount, size = 14 }: { rating: number; reviewsCount: number; size?: number }) => {
  return (
    <div className="flex items-center gap-1.5">
      <IconStarFilled size={size} className="text-yellow-500" />
      <span className="text-sm font-semibold text-slate-900">
        {rating > 0 ? rating.toFixed(1) : '—'}
      </span>
      <span className="text-sm text-slate-500">
        ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
});
StarRating.displayName = 'StarRating';

export default function EnrolledCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [speakers, setSpeakers] = useState<Map<string, Speaker>>(new Map());
  const [courseRatings, setCourseRatings] = useState<Map<string, CourseRating>>(new Map());
  const [courseProgress, setCourseProgress] = useState<Map<string, CourseProgress>>(new Map());
  const [courseAccessInfo, setCourseAccessInfo] = useState<Map<string, CourseAccessInfo>>(new Map());
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadingFavorite, setLoadingFavorite] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Función para cargar favoritos
  const fetchFavorites = async () => {
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
  };

  // Función para toggle de favorito
  const handleToggleFavorite = async (courseId: string, e: React.MouseEvent) => {
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
  };

  // Toggle para expandir/colapsar secciones de un curso
  const toggleCourseExpand = (courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const getCourseRating = useCallback((courseId: string): CourseRating => {
    return courseRatings.get(courseId) || { averageRating: 0, reviewsCount: 0 };
  }, [courseRatings]);

  // Función para obtener el progreso de un curso
  const fetchCourseProgress = async (courseId: string): Promise<CourseProgress | null> => {
    if (!user) return null;

    try {
      // Obtener progreso del estudiante
      const progressRes = await fetch(`/api/student/progress?courseId=${courseId}&userId=${user.id}`);
      if (!progressRes.ok) return null;

      const progressData = await progressRes.json();

      // Obtener lecciones del curso
      const lessonsRes = await fetch(`/api/student/getLessons?courseId=${courseId}`);
      if (!lessonsRes.ok) return null;

      const lessonsData = await lessonsRes.json();
      const lessons = lessonsData.lessons || [];

      // Calcular progreso por lección
      const lessonProgressList: LessonProgress[] = lessons.map((lesson: any) => {
        let totalSubsections = 1;
        try {
          if (lesson.content) {
            const parsed = JSON.parse(lesson.content);
            totalSubsections = parsed.subsections?.length || 1;
          }
        } catch { }

        const isCompleted = progressData.completedLessons?.includes(lesson.id) || false;
        const highestIndex = progressData.subsectionProgress?.[lesson.id] ?? -1;
        const completedSubsections = isCompleted ? totalSubsections : Math.max(0, highestIndex + 1);

        return {
          id: lesson.id,
          title: lesson.title,
          totalSubsections,
          completedSubsections: Math.min(completedSubsections, totalSubsections),
          isCompleted,
        };
      });

      // Obtener el índice de subsección del último acceso
      const lastAccessedLessonId = progressData.lastAccessedLessonId || null;
      let lastAccessedSubsectionIndex = 0;
      if (lastAccessedLessonId && progressData.subsectionProgress) {
        lastAccessedSubsectionIndex = progressData.subsectionProgress[lastAccessedLessonId] ?? 0;
        // Si la subsección está completada, ir a la siguiente
        if (lastAccessedSubsectionIndex >= 0) {
          const lessonData = lessons.find((l: any) => l.id === lastAccessedLessonId);
          if (lessonData?.content) {
            try {
              const parsed = JSON.parse(lessonData.content);
              const totalSubs = parsed.subsections?.length || 1;
              // Si no ha completado todas, avanzar al siguiente
              if (lastAccessedSubsectionIndex < totalSubs - 1) {
                lastAccessedSubsectionIndex += 1;
              }
            } catch { }
          }
        }
      }

      return {
        progress: progressData.progress || 0,
        completedLessons: progressData.completedLessons || [],
        subsectionProgress: progressData.subsectionProgress || {},
        totalLessons: progressData.totalLessons || lessons.length,
        lessons: lessonProgressList,
        lastAccessedLessonId,
        lastAccessedSubsectionIndex: Math.max(0, lastAccessedSubsectionIndex),
      };
    } catch (error) {
      console.error(`Error fetching progress for course ${courseId}:`, error);
      return null;
    }
  };

  const getProgress = (courseId: string): CourseProgress | null => {
    return courseProgress.get(courseId) || null;
  };

  const getAccessInfo = (courseId: string): CourseAccessInfo | null => {
    return courseAccessInfo.get(courseId) || null;
  };

  useEffect(() => {
    const loadEnrolledCourses = async () => {
      if (!user) return;

      try {
        // ✅ OPTIMIZACIÓN: Usar endpoint consolidado que elimina N+1 queries
        const [coursesRes, favoritesRes] = await Promise.all([
          fetch(`/api/student/enrolled-courses-full`),
          fetch(`/api/student/favorites?userId=${user.id}`)
        ]);

        // Procesar favoritos
        if (favoritesRes.ok) {
          const favData = await favoritesRes.json();
          const favIds = new Set<string>((favData.favorites || []).map((f: any) => f.course_id));
          setFavorites(favIds);
        }

        if (!coursesRes.ok) {
          setCourses([]);
          return;
        }

        const data = await coursesRes.json();
        const enrolledCourses = data.courses || [];

        if (enrolledCourses.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }

        // Transformar datos del endpoint a la estructura local
        const coursesData: Course[] = enrolledCourses.map((c: any) => ({
          id: c.courseId,
          title: c.title,
          description: c.description,
          coverImageUrl: c.coverImageUrl,
          speakerIds: c.teacher ? [c.teacher.id] : [],
          lessonCount: c.lessonCount || 0,
          createdAt: c.enrolledAt,
          startDate: undefined,
        }));

        setCourses(coursesData);

        // Ratings desde el endpoint consolidado
        const ratingsMap = new Map<string, CourseRating>();
        enrolledCourses.forEach((c: any) => {
          ratingsMap.set(c.courseId, {
            averageRating: c.averageRating || 0,
            reviewsCount: c.reviewsCount || 0,
          });
        });
        setCourseRatings(ratingsMap);

        // Speakers desde el endpoint consolidado
        const speakersMap = new Map<string, Speaker>();
        enrolledCourses.forEach((c: any) => {
          if (c.teacher) {
            speakersMap.set(c.teacher.id, {
              id: c.teacher.id,
              name: c.teacher.name,
              lastName: '',
              email: '',
              avatarUrl: c.teacher.avatarUrl,
            });
          }
        });
        setSpeakers(speakersMap);

        // Access info desde el endpoint consolidado
        const accessMap = new Map<string, CourseAccessInfo>();
        enrolledCourses.forEach((c: any) => {
          if (c.microcredentialAccess?.isMicrocredentialCourse) {
            accessMap.set(c.courseId, {
              isMicrocredentialCourse: true,
              isLevel2Locked: c.microcredentialAccess.isLevel2Locked,
              microcredentialId: c.microcredentialAccess.microcredentialId,
              levelNumber: c.microcredentialAccess.levelNumber,
            });
          }
        });
        setCourseAccessInfo(accessMap);

        // ✅ NOTA: El progreso detallado todavía requiere la llamada separada
        // porque incluye información de subsecciones que es compleja
        const progressResults = await Promise.all(
          coursesData.map(async (course) => {
            const progress = await fetchCourseProgress(course.id);
            return { courseId: course.id, progress };
          })
        );

        const progressMap = new Map<string, CourseProgress>();
        progressResults.forEach(r => {
          if (r.progress) progressMap.set(r.courseId, r.progress);
        });
        setCourseProgress(progressMap);

      } catch (error) {
        console.error("Error loading enrolled courses:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEnrolledCourses();
  }, [user]);

  const getCourseSpeaker = (course: Course): Speaker | null => {
    if (!course.speakerIds || course.speakerIds.length === 0) return null;
    return speakers.get(course.speakerIds[0]) || null;
  };

  const formatCourseDateTime = (course: Course): string | null => {
    if (!course.startDate) return null;
    const date = new Date(course.startDate);
    const dateStr = date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr} • ${timeStr}`;
  };

  const formatCreatedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Mis Cursos</h1>
        <p className="text-base-content/70">
          Cursos en los que te has inscrito.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12">
          <IconBook size={64} className="mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">No estás inscrito en ningún curso</h2>
          <p className="text-base-content/70 mb-6">
            Explora los cursos disponibles y comienza a aprender
          </p>
          <Link href="/dashboard/available-courses" className="btn btn-primary">
            Ver Cursos Disponibles
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {courses.map((course) => {
            const progress = getProgress(course.id);
            const speaker = getCourseSpeaker(course);
            const rating = getCourseRating(course.id);
            const accessInfo = getAccessInfo(course.id);
            const isLocked = accessInfo?.isLevel2Locked || false;

            return (
              <article
                key={course.id}
                className={`flex flex-col sm:flex-row bg-white rounded-3xl shadow-card-soft overflow-hidden transition-all duration-200 ${isLocked ? '' : 'hover:shadow-card hover:-translate-y-1'}`}
              >
                {/* Imagen del curso - Lado izquierdo */}
                <div className={`relative w-full sm:w-48 md:w-56 flex-shrink-0 h-48 sm:h-auto ${isLocked ? 'opacity-70 grayscale' : ''}`}>
                  <Link
                    href={isLocked ? '#' : `/dashboard/student/courses/${course.id}`}
                    className="block h-full"
                    onClick={(e) => isLocked && e.preventDefault()}
                  >
                    {course.coverImageUrl ? (
                      <img
                        src={course.coverImageUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 text-brand-primary">
                        <IconBook size={56} stroke={1.5} />
                      </div>
                    )}
                  </Link>

                  {/* Overlay de candado si está bloqueado */}
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="p-3 rounded-full shadow-lg bg-gray-800">
                        <IconLock className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Badge de progreso - Esquina superior derecha de la imagen */}
                  {progress && !isLocked && (
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-0.5 shadow-md">
                      <span className={`text-xs font-bold ${progress.progress === 100 ? 'text-green-600' : 'text-brand-primary'}`}>
                        {progress.progress}%
                      </span>
                    </div>
                  )}

                  {/* Badge de Nivel si es microcredencial */}
                  {accessInfo?.isMicrocredentialCourse && accessInfo.levelNumber && (
                    <div className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md">
                      Nivel {accessInfo.levelNumber}
                    </div>
                  )}
                </div>

                {/* Contenido - Lado derecho */}
                <div className={`flex flex-1 flex-col p-5 relative ${isLocked ? 'opacity-70' : ''}`}>
                  {/* Badge de progreso circular - Esquina superior derecha del contenido */}
                  {progress && !isLocked && (
                    <div className="absolute top-4 right-4 flex flex-col items-center">
                      <div className={`relative w-14 h-14 rounded-full flex items-center justify-center ${progress.progress === 100
                        ? 'bg-gradient-to-br from-cyan-400 to-cyan-500'
                        : 'bg-gradient-to-br from-brand-primary to-brand-secondary'
                        }`}>
                        {progress.progress === 100 ? (
                          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-white text-sm font-bold">{progress.progress}%</span>
                        )}
                      </div>
                      {progress.progress === 100 && (
                        <span className="text-xs font-semibold text-cyan-600 mt-1">100%</span>
                      )}
                    </div>
                  )}

                  {/* Badge de bloqueado */}
                  {isLocked && (
                    <div className="absolute top-4 right-4 flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-400">
                        <IconLock className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 mt-1">Bloqueado</span>
                    </div>
                  )}

                  {/* Título del curso */}
                  <Link
                    href={isLocked ? '#' : `/dashboard/student/courses/${course.id}`}
                    onClick={(e) => isLocked && e.preventDefault()}
                  >
                    <h3 className={`text-lg font-bold text-slate-900 pr-20 leading-tight transition-colors line-clamp-2 ${isLocked ? '' : 'hover:text-brand-primary'}`}>
                      {course.title}
                    </h3>
                  </Link>

                  {/* Instructor con avatar */}
                  {speaker && (
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-brand-primary flex items-center justify-center flex-shrink-0">
                        {speaker.avatarUrl ? (
                          <img src={speaker.avatarUrl} alt={speaker.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-xs font-semibold">
                            {speaker.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-slate-700 font-medium">
                        {speaker.name} {speaker.lastName || ''}
                      </span>
                    </div>
                  )}

                  {/* Rating - usando componente memoizado */}
                  <StarRating
                    rating={rating.averageRating}
                    reviewsCount={rating.reviewsCount}
                  />

                  {/* Link para ver progreso por sección */}
                  {progress && progress.lessons.length > 0 && !isLocked && (
                    <button
                      onClick={(e) => toggleCourseExpand(course.id, e)}
                      className="flex items-center gap-1 mt-3 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors self-start"
                    >
                      Ver progreso por sección
                    </button>
                  )}

                  {/* Mensaje de bloqueo */}
                  {isLocked && (
                    <div className="mt-3 text-sm text-amber-600 font-medium">
                      🔒 Completa el Nivel 1 para desbloquear
                    </div>
                  )}

                  {/* Espaciador flexible */}
                  <div className="flex-1 min-h-2" />

                  {/* Botón de favorito y acción principal */}
                  <div className="flex items-center gap-3 mt-4">
                    {/* Botón de favorito */}
                    <button
                      onClick={(e) => handleToggleFavorite(course.id, e)}
                      disabled={loadingFavorite === course.id}
                      className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all flex-shrink-0"
                      title={favorites.has(course.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                    >
                      {loadingFavorite === course.id ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : favorites.has(course.id) ? (
                        <IconHeartFilled size={18} className="text-red-500" />
                      ) : (
                        <IconHeart size={18} className="text-gray-400 hover:text-red-500" />
                      )}
                    </button>

                    {/* Botón principal */}
                    {isLocked ? (
                      <button
                        disabled
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 font-semibold rounded-full text-sm bg-gray-300 text-gray-500 cursor-not-allowed"
                      >
                        <IconLock size={16} />
                        Bloqueado
                      </button>
                    ) : (
                      <Link
                        href={(() => {
                          // Si hay progreso y una última lección accedida, ir directamente ahí
                          if (progress && progress.lastAccessedLessonId && progress.progress > 0 && progress.progress < 100) {
                            return `/student/courses/${course.id}/learn/lecture/${progress.lastAccessedLessonId}?subsection=${progress.lastAccessedSubsectionIndex}`;
                          }
                          // Si el curso está completo o no ha comenzado, ir a la vista del curso
                          return `/dashboard/student/courses/${course.id}`;
                        })()}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-5 font-semibold rounded-full transition-all text-sm ${progress && progress.progress > 0 && progress.progress < 100
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md'
                          : 'bg-brand-primary text-white hover:bg-brand-primary/90'
                          }`}
                      >
                        {progress && progress.progress === 100 ? (
                          <>
                            Revisar curso
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </>
                        ) : progress && progress.progress > 0 ? (
                          <>
                            Continuar
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </>
                        ) : (
                          <>
                            Comenzar curso
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </>
                        )}
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal/Overlay para contenido expandido - FUERA DEL BLOQUE CONDICIONAL */}
      {expandedCourses.size > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {courses.map((course) => {
              const progress = getProgress(course.id);
              const isExpanded = expandedCourses.has(course.id);

              if (!isExpanded || !progress) return null;

              return (
                <div key={course.id} className="p-6">
                  {/* Header del modal */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h2>
                      <p className="text-sm text-gray-600">Progreso por sección</p>
                    </div>
                    <button
                      onClick={(e) => toggleCourseExpand(course.id, e)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Lista de secciones */}
                  <div className="space-y-3">
                    {progress.lessons.map((lesson, index) => {
                      const lessonProgress = lesson.totalSubsections > 0
                        ? Math.round((lesson.completedSubsections / lesson.totalSubsections) * 100)
                        : 0;

                      return (
                        <div key={lesson.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-gray-700 line-clamp-2 flex-1 pr-3">
                              {index + 1}. {lesson.title}
                            </span>
                            <span className={`text-sm font-bold shrink-0 ${lessonProgress === 100 ? 'text-green-600' : 'text-purple-600'}`}>
                              {lessonProgress}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${lessonProgress === 100 ? 'bg-green-500' : 'bg-purple-600'}`}
                              style={{ width: `${lessonProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {lesson.completedSubsections} de {lesson.totalSubsections} lecciones completadas
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer del modal */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{progress.completedLessons.length}</span> de{' '}
                        <span className="font-medium">{progress.totalLessons}</span> secciones completadas
                      </div>
                      <Link
                        href={`/dashboard/student/courses/${course.id}`}
                        className="btn btn-primary text-white"
                      >
                        {progress.progress === 100 ? 'Revisar curso' : 'Continuar'} →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
