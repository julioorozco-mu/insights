"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { Course } from "@/types/course";
import { Loader } from "@/components/common/Loader";
import { formatDate } from "@/utils/formatDate";
import { stripHtmlAndTruncate } from "@/lib/utils";
import { 
  IconBook, 
  IconClock, 
  IconUsers, 
  IconCheck,
  IconPlayerPlay,
  IconCalendar,
  IconStar,
  IconStarFilled
} from "@tabler/icons-react";
import { userRepository } from "@/lib/repositories/userRepository";
import CoursePreviewSideSheet from "@/components/course/CoursePreviewSideSheet";

interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
  progress: number;
  completedLessons: string[];
}

interface Speaker {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  avatarUrl?: string;
}

interface CourseRating {
  averageRating: number;
  reviewsCount: number;
}

export default function AvailableCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [speakers, setSpeakers] = useState<Map<string, Speaker>>(new Map());
  const [courseRatings, setCourseRatings] = useState<Map<string, CourseRating>>(new Map());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [enrolledCourseId, setEnrolledCourseId] = useState<string | null>(null);
  const [previewCourseId, setPreviewCourseId] = useState<string | null>(null);
  const { user } = useAuth();

  // Función para obtener el rating de un curso
  const fetchCourseRating = async (courseId: string): Promise<CourseRating> => {
    try {
      const response = await fetch(`/api/student/rating?courseId=${courseId}`);
      if (response.ok) {
        const data = await response.json();
        return {
          averageRating: data.courseStats?.average_rating || 0,
          reviewsCount: data.courseStats?.reviews_count || 0,
        };
      }
    } catch (error) {
      console.error(`Error fetching rating for course ${courseId}:`, error);
    }
    return { averageRating: 0, reviewsCount: 0 };
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Cargar todos los cursos activos
        const allCourses = await courseRepository.findAll();
        const activeCourses = allCourses.filter(c => c.isActive);
        setCourses(activeCourses);

        // Cargar inscripciones del estudiante usando API student (sesión)
        const enrollmentsRes = await fetch(`/api/student/getEnrollments`);
        if (enrollmentsRes.ok) {
          const enrollmentsData = await enrollmentsRes.json();
          setEnrollments(enrollmentsData.enrollments || []);
        } else {
          setEnrollments([]);
        }

        // Cargar información de los speakers
        const speakerIds = new Set<string>();
        activeCourses.forEach(course => {
          course.speakerIds?.forEach(id => speakerIds.add(id));
        });

        const speakersMap = new Map<string, Speaker>();
        for (const speakerId of speakerIds) {
          const user = await userRepository.findById(speakerId);
          if (user) {
            speakersMap.set(speakerId, {
              id: user.id,
              name: user.name,
              lastName: '',
              email: user.email,
              avatarUrl: user.avatarUrl,
            });
          }
        }
        setSpeakers(speakersMap);

        // Cargar ratings de todos los cursos
        const ratingsMap = new Map<string, CourseRating>();
        await Promise.all(
          activeCourses.map(async (course) => {
            const rating = await fetchCourseRating(course.id);
            ratingsMap.set(course.id, rating);
          })
        );
        setCourseRatings(ratingsMap);
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const isEnrolled = (courseId: string) => {
    return enrollments.some(e => e.courseId === courseId);
  };

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

  // Función para renderizar las estrellas
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <IconStarFilled key={i} size={16} className="text-yellow-500" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <IconStar size={16} className="text-yellow-500" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <IconStarFilled size={16} className="text-yellow-500" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <IconStar key={i} size={16} className="text-yellow-500" />
        );
      }
    }
    return stars;
  };

  const getCourseRating = (courseId: string): CourseRating => {
    return courseRatings.get(courseId) || { averageRating: 0, reviewsCount: 0 };
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;

    try {
      setEnrolling(courseId);
      
      // Usar API student para inscribirse
      const res = await fetch('/api/student/enrollStudent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al inscribirse');
      }

      if (data.alreadyEnrolled) {
        alert('Ya estás inscrito en este curso');
        router.push(`/dashboard/student/courses/${courseId}`);
        return;
      }

      // Actualizar estado local
      setEnrollments(prev => [...prev, {
        id: data.enrollment.id,
        courseId: data.enrollment.courseId,
        studentId: data.enrollment.studentId,
        enrolledAt: data.enrollment.enrolledAt,
        progress: 0,
        completedLessons: [],
      }]);

      // Cerrar el side sheet
      setPreviewCourseId(null);

      // Mostrar modal de éxito
      setEnrolledCourseId(courseId);
      setShowSuccessModal(true);
      
      // Redirigir después de 3 segundos
      setTimeout(() => {
        router.push(`/dashboard/student/courses/${courseId}`);
      }, 3000);
    } catch (error: any) {
      console.error('Error enrolling:', error);
      alert(error.message || 'Error al inscribirse al curso');
    } finally {
      setEnrolling(null);
    }
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

  const enrolledCourses = courses.filter(c => isEnrolled(c.id));
  const availableCourses = courses.filter(c => !isEnrolled(c.id));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Cursos Disponibles</h1>
        <p className="text-base-content/70">
          Explora y inscríbete a los cursos disponibles
        </p>
      </div>

      {/* Estadísticas */}
      <div className="stats shadow w-full mb-8">
        <div className="stat">
          <div className="stat-figure text-primary">
            <IconBook size={32} />
          </div>
          <div className="stat-title">Cursos Disponibles</div>
          <div className="stat-value text-primary">{availableCourses.length}</div>
          <div className="stat-desc">Para inscribirse</div>
        </div>
      </div>


      {/* Cursos Disponibles */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          Cursos Disponibles para Inscripción
        </h2>
        
        {availableCourses.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-12">
              <div className="text-primary mb-4 flex justify-center">
                <IconBook size={64} stroke={2} />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {enrolledCourses.length > 0 
                  ? '¡Ya estás inscrito en todos los cursos disponibles!'
                  : 'No hay cursos disponibles'}
              </h2>
              <p className="text-base-content/70">
                {enrolledCourses.length > 0
                  ? 'Puedes revisar tus cursos inscritos en "Mis Cursos"'
                  : 'Los cursos aparecerán aquí cuando estén disponibles'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map((course) => (
              <div 
                key={course.id} 
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
                onClick={() => setPreviewCourseId(course.id)}
              >
                <figure className="h-48 bg-base-300">
                  {course.coverImageUrl ? (
                    <img 
                      src={course.coverImageUrl} 
                      alt={course.title} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-primary">
                      <IconBook size={64} stroke={2} />
                    </div>
                  )}
                </figure>
                <div className="card-body">
                  <h2 className="card-title">{course.title}</h2>
                  <p className="text-sm text-base-content/70 line-clamp-2">
                    {stripHtmlAndTruncate(course.description, 120)}
                  </p>
                  
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

                  {/* Rating del curso */}
                  {(() => {
                    const rating = getCourseRating(course.id);
                    return (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-0.5">
                          {renderStars(rating.averageRating)}
                        </div>
                        <span className="text-sm font-medium">
                          {rating.averageRating > 0 ? rating.averageRating.toFixed(1) : '—'}
                        </span>
                        <span className="text-xs text-base-content/60">
                          ({rating.reviewsCount} {rating.reviewsCount === 1 ? 'reseña' : 'reseñas'})
                        </span>
                      </div>
                    );
                  })()}

                  {/* Fecha de inicio del curso */}
                  {formatCourseDateTime(course) && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-base-content/70">
                      <IconCalendar size={16} />
                      <span>{formatCourseDateTime(course)}</span>
                    </div>
                  )}

                  {/* Fecha de creación del curso */}
                  {course.createdAt && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-base-content/60">
                      <IconClock size={14} />
                      <span>Creado: {formatCreatedDate(course.createdAt)}</span>
                    </div>
                  )}

                  <div className="card-actions mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewCourseId(course.id);
                      }}
                      className="btn btn-primary text-white w-full"
                    >
                      Ver detalles
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de éxito */}
      {showSuccessModal && (
        <div className="modal modal-open">
          <div className="modal-box text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-success p-3">
                <IconCheck size={48} className="text-white" />
              </div>
            </div>
            <h3 className="font-bold text-2xl mb-2">¡Inscripción Exitosa!</h3>
            <p className="text-lg mb-4">Te has inscrito exitosamente al curso</p>
            <p className="text-sm text-base-content/70 mb-6">
              Serás redirigido al curso en 3 segundos...
            </p>
            <div className="flex justify-center">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
            <div className="modal-action justify-center">
              <button
                onClick={() => router.push(`/dashboard/student/courses/${enrolledCourseId}`)}
                className="btn btn-primary text-white"
              >
                Ir al curso ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Preview Side Sheet */}
      <CoursePreviewSideSheet
        courseId={previewCourseId}
        isOpen={!!previewCourseId}
        onClose={() => setPreviewCourseId(null)}
        onEnroll={handleEnroll}
        enrolling={!!enrolling}
      />
    </div>
  );
}
