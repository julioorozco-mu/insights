"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { Course } from "@/types/course";
import { Loader } from "@/components/common/Loader";
import { formatDate } from "@/utils/formatDate";
import { 
  IconBook, 
  IconClock, 
  IconUsers, 
  IconCheck,
  IconPlayerPlay,
  IconCalendar
} from "@tabler/icons-react";
import { userRepository } from "@/lib/repositories/userRepository";

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

export default function AvailableCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [speakers, setSpeakers] = useState<Map<string, Speaker>>(new Map());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [enrolledCourseId, setEnrolledCourseId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Cargar todos los cursos activos
        const allCourses = await courseRepository.findAll();
        const activeCourses = allCourses.filter(c => c.isActive);
        setCourses(activeCourses);

        // Cargar inscripciones del estudiante usando API admin
        const enrollmentsRes = await fetch(`/api/admin/getEnrollments?userId=${user.id}`);
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

  const formatCourseDateTime = (course: Course): string => {
    if (!course.startDate) return 'Fecha por confirmar';
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

  const handleEnroll = async (courseId: string) => {
    if (!user) return;

    try {
      setEnrolling(courseId);
      
      // Usar API admin para inscribirse
      const res = await fetch('/api/admin/enrollStudent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
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
              <div key={course.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
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
                    {course.description}
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

                  {/* Fecha del curso */}
                  <div className="flex items-center gap-2 mt-2 text-sm text-base-content/70">
                    <IconCalendar size={16} />
                    <span>{formatCourseDateTime(course)}</span>
                  </div>

                  <div className="card-actions mt-4">
                    <button
                      onClick={() => handleEnroll(course.id)}
                      className="btn btn-primary text-white w-full"
                      disabled={enrolling === course.id}
                    >
                      {enrolling === course.id ? 'Inscribiendo...' : 'Inscribirse'}
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
    </div>
  );
}
