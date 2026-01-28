"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { userRepository } from "@/lib/repositories/userRepository";
import { Loader } from "@/components/common/Loader";
import {
  IconBook,
  IconCalendarCheck,
  IconCertificate,
  IconPlayerPlay,
  IconHeart,
  IconHeartFilled,
  IconTrophy
} from "@tabler/icons-react";

interface Speaker {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  avatarUrl?: string;
}

interface CompletedCourse {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  speakerIds?: string[];
  completedAt: string; // Fecha de finalización
}

interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  progress: number;
  completedAt?: string;
  updatedAt?: string;
}

export default function CompletedCoursesPage() {
  const [courses, setCourses] = useState<CompletedCourse[]>([]);
  const [speakers, setSpeakers] = useState<Map<string, Speaker>>(new Map());
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

  // Función para obtener la fecha de finalización de un curso
  const getCompletionDate = async (courseId: string): Promise<string | null> => {
    try {
      // Intentar obtener la fecha desde la última evaluación completada
      const testResponse = await fetch(`/api/student/getCompletedTests?courseId=${courseId}`);
      if (testResponse.ok) {
        const testData = await testResponse.json();
        if (testData.completedTests && testData.completedTests.length > 0) {
          // Ordenar por fecha y obtener la más reciente
          const sortedTests = testData.completedTests.sort((a: any, b: any) =>
            new Date(b.completed_at || b.createdAt).getTime() -
            new Date(a.completed_at || a.createdAt).getTime()
          );
          return sortedTests[0].completed_at || sortedTests[0].createdAt;
        }
      }
    } catch (error) {
      console.log('No test completion data found');
    }

    return null;
  };

  useEffect(() => {
    const loadCompletedCourses = async () => {
      if (!user) return;

      try {
        // ✅ OPTIMIZACIÓN: Ejecutar llamadas independientes en paralelo (async-parallel)
        const [enrollmentsRes, favoritesRes] = await Promise.all([
          fetch(`/api/student/getEnrollments`),
          fetch(`/api/student/favorites?userId=${user.id}`)
        ]);

        // Procesar favoritos
        if (favoritesRes.ok) {
          const favData = await favoritesRes.json();
          const favIds = new Set<string>((favData.favorites || []).map((f: any) => f.course_id));
          setFavorites(favIds);
        }

        if (!enrollmentsRes.ok) {
          setCourses([]);
          return;
        }

        const enrollmentsData = await enrollmentsRes.json();
        const enrollments: Enrollment[] = enrollmentsData.enrollments || [];

        // Filtrar solo los cursos con progreso 100%
        const completedEnrollments = enrollments.filter(e => e.progress >= 100);

        if (completedEnrollments.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }

        // ✅ OPTIMIZACIÓN: Cargar cursos y fechas de finalización en paralelo
        const coursesPromises = completedEnrollments.map(async (enrollment) => {
          // Ejecutar ambas llamadas en paralelo por cada enrollment
          const [course, completedTestsRes] = await Promise.all([
            courseRepository.findById(enrollment.courseId),
            fetch(`/api/student/getCompletedTests?courseId=${enrollment.courseId}`)
          ]);

          if (course) {
            // Obtener fecha de finalización desde evaluaciones
            let completedAt: string | null = null;
            if (completedTestsRes.ok) {
              const testData = await completedTestsRes.json();
              if (testData.completedTests && testData.completedTests.length > 0) {
                const sortedTests = testData.completedTests.sort((a: any, b: any) =>
                  new Date(b.completed_at || b.createdAt).getTime() -
                  new Date(a.completed_at || a.createdAt).getTime()
                );
                completedAt = sortedTests[0].completed_at || sortedTests[0].createdAt;
              }
            }

            // Si no hay fecha de evaluación, usar la fecha de actualización del enrollment
            if (!completedAt) {
              completedAt = enrollment.updatedAt || enrollment.completedAt || new Date().toISOString();
            }

            return {
              id: course.id,
              title: course.title,
              description: course.description,
              coverImageUrl: course.coverImageUrl,
              speakerIds: course.speakerIds,
              completedAt,
            } as CompletedCourse;
          }
          return null;
        });

        const coursesData = (await Promise.all(coursesPromises)).filter(
          (course): course is CompletedCourse => course !== null
        );

        // Ordenar por fecha de finalización (más recientes primero)
        coursesData.sort((a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );

        setCourses(coursesData);

        // ✅ OPTIMIZACIÓN: Cargar speakers en paralelo
        const speakerIds = [...new Set(coursesData.flatMap(c => c.speakerIds || []))];
        const speakersData = await Promise.all(
          speakerIds.map(async (speakerId) => {
            try {
              const userData = await userRepository.findById(speakerId);
              if (userData) {
                return {
                  id: userData.id,
                  name: userData.name,
                  lastName: '',
                  email: userData.email,
                  avatarUrl: userData.avatarUrl,
                } as Speaker;
              }
            } catch (error) {
              console.error(`Error loading speaker ${speakerId}:`, error);
            }
            return null;
          })
        );

        const speakersMap = new Map<string, Speaker>();
        speakersData.filter(Boolean).forEach(s => speakersMap.set(s!.id, s!));
        setSpeakers(speakersMap);
      } catch (error) {
        console.error("Error loading completed courses:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCompletedCourses();
  }, [user]);

  const getCourseSpeaker = (course: CompletedCourse): Speaker | null => {
    if (!course.speakerIds || course.speakerIds.length === 0) return null;
    return speakers.get(course.speakerIds[0]) || null;
  };

  const formatCompletionDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Cursos Completados</h1>
        <p className="text-base-content/70">
          Historial de microcredenciales que has finalizado
        </p>
      </div>

      {/* Estadísticas */}
      <div className="stats shadow w-full mb-8">
        <div className="stat">
          <div className="stat-figure text-success">
            <IconTrophy size={32} />
          </div>
          <div className="stat-title">Cursos Completados</div>
          <div className="stat-value text-success">{courses.length}</div>
          <div className="stat-desc">Microcredenciales obtenidas</div>
        </div>
      </div>

      {/* Lista de cursos completados */}
      {courses.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-success mb-4 flex justify-center">
              <IconBook size={64} stroke={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Aún no has completado ningún curso
            </h2>
            <p className="text-base-content/70 mb-4">
              Cuando termines un curso al 100%, aparecerá aquí en tu historial.
            </p>
            <div className="card-actions justify-center">
              <Link href="/dashboard/enrolled-courses" className="btn btn-primary">
                Ver mis cursos en progreso
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
            >
              <figure className="h-48 bg-base-300 relative">
                {course.coverImageUrl ? (
                  <img
                    src={course.coverImageUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-success">
                    <IconBook size={64} stroke={2} />
                  </div>
                )}

                {/* Badge de completado */}
                <div className="absolute top-3 right-3 bg-success text-white rounded-full px-3 py-1 shadow-lg flex items-center gap-1">
                  <IconTrophy size={16} />
                  <span className="text-sm font-bold">100%</span>
                </div>

                {/* Botón de favorito */}
                <button
                  onClick={(e) => handleToggleFavorite(course.id, e)}
                  disabled={loadingFavorite === course.id}
                  className="absolute top-3 left-3 p-2 rounded-full bg-white/90 hover:bg-white shadow-md transition-all hover:scale-110 z-10"
                  title={favorites.has(course.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                  {loadingFavorite === course.id ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : favorites.has(course.id) ? (
                    <IconHeartFilled size={20} className="text-red-500" />
                  ) : (
                    <IconHeart size={20} className="text-gray-600 hover:text-red-500" />
                  )}
                </button>
              </figure>

              <div className="card-body">
                <h2 className="card-title text-lg">{course.title}</h2>

                {/* Instructor */}
                {(() => {
                  const speaker = getCourseSpeaker(course);
                  return speaker ? (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="avatar">
                        <div className="w-8 h-8 rounded-full">
                          {speaker.avatarUrl ? (
                            <img src={speaker.avatarUrl} alt={speaker.name} />
                          ) : (
                            <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full text-xs font-semibold">
                              {speaker.name.charAt(0)}{speaker.lastName?.charAt(0) || ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-medium">
                        {speaker.name} {speaker.lastName || ''}
                      </span>
                    </div>
                  ) : null;
                })()}

                {/* Fecha de finalización */}
                <div className="flex items-center gap-2 mt-2 text-sm text-success">
                  <IconCalendarCheck size={18} />
                  <span className="font-medium">
                    Completado el {formatCompletionDate(course.completedAt)}
                  </span>
                </div>

                {/* Acciones */}
                <div className="card-actions justify-between mt-4 pt-4 border-t border-base-200">
                  <Link
                    href={`/dashboard/student/courses/${course.id}`}
                    className="btn btn-outline btn-sm flex-1"
                  >
                    <IconPlayerPlay size={16} />
                    Revisar contenido
                  </Link>
                  <Link
                    href={`/dashboard/credentials`}
                    className="btn btn-success btn-sm"
                  >
                    <IconCertificate size={16} />
                    Ver certificado
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
