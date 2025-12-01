"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { userRepository } from "@/lib/repositories/userRepository";
import { lessonRepository } from "@/lib/repositories/lessonRepository";
import { useAuth } from "@/hooks/useAuth";
import { Course } from "@/types/course";
import { User } from "@/types/user";
import { Lesson } from "@/types/lesson";
import { Loader } from "@/components/common/Loader";
import {
  IconClock,
  IconCalendar,
  IconUsers,
  IconBook,
  IconCheck,
  IconAlertCircle,
  IconChevronRight,
} from "@tabler/icons-react";

export default function CoursePublicPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [speakers, setSpeakers] = useState<User[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<"open" | "closed" | "upcoming">("closed");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadCourse();
  }, [params.id, user]);

  const loadCourse = async () => {
    try {
      const courseId = params.id as string;

      // Cargar curso desde Supabase
      const courseData = await courseRepository.findById(courseId);
      if (courseData) {
        setCourse(courseData);

        // Verificar estado de inscripción
        checkEnrollmentStatus(courseData);

        // Cargar ponentes
        if (courseData.speakerIds && courseData.speakerIds.length > 0) {
          const speakersData: User[] = [];
          for (const id of courseData.speakerIds) {
            const speaker = await userRepository.findById(id);
            if (speaker) speakersData.push(speaker as User);
          }
          setSpeakers(speakersData);
        }

        // Cargar lecciones
        const lessonsData = await lessonRepository.findByCourseId(courseId);
        setLessons(lessonsData.sort((a: Lesson, b: Lesson) => (a.order || 0) - (b.order || 0)));

        // Verificar si el usuario ya está inscrito
        if (user) {
          const { data: studentData } = await supabaseClient
            .from(TABLES.STUDENTS)
            .select('id')
            .eq('user_id', user.id)
            .single();
          
          if (studentData) {
            const { data: enrollment } = await supabaseClient
              .from(TABLES.STUDENT_ENROLLMENTS)
              .select('id')
              .eq('course_id', courseId)
              .eq('student_id', studentData.id)
              .single();
            setIsEnrolled(!!enrollment);
          }
        }
      }
    } catch (error) {
      console.error("Error loading course:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = (courseData: Course) => {
    const now = new Date();

    // Si es inscripción ilimitada
    if (courseData.unlimitedEnrollment) {
      setEnrollmentStatus("open");
      return;
    }

    // Si tiene fechas de inscripción
    if (courseData.enrollmentStartDate && courseData.enrollmentEndDate) {
      const startDate = new Date(courseData.enrollmentStartDate);
      const endDate = new Date(courseData.enrollmentEndDate);

      if (now < startDate) {
        setEnrollmentStatus("upcoming");
      } else if (now >= startDate && now <= endDate) {
        setEnrollmentStatus("open");
      } else {
        setEnrollmentStatus("closed");
      }
    } else {
      setEnrollmentStatus("closed");
    }
  };

  const handleEnroll = async () => {
    if (!user || !course) return;

    if (user.role !== "student") {
      alert("Solo los estudiantes pueden inscribirse a cursos");
      return;
    }

    try {
      setEnrolling(true);

      // Obtener o crear student record
      let studentId = user.id;
      const { data: existingStudent } = await supabaseClient
        .from(TABLES.STUDENTS)
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!existingStudent) {
        const { data: newStudent } = await supabaseClient
          .from(TABLES.STUDENTS)
          .insert({ user_id: user.id })
          .select('id')
          .single();
        if (newStudent) studentId = newStudent.id;
      } else {
        studentId = existingStudent.id;
      }

      // Crear enrollment
      await supabaseClient
        .from(TABLES.STUDENT_ENROLLMENTS)
        .insert({
          course_id: course.id,
          student_id: studentId,
          progress: 0,
          completed_lessons: [],
        });

      setIsEnrolled(true);
      
      // Mostrar modal de éxito
      setShowSuccessModal(true);
      
      // Redirigir después de 3 segundos
      setTimeout(() => {
        router.push(`/dashboard/student/courses/${course.id}`);
      }, 3000);
    } catch (error) {
      console.error("Error enrolling:", error);
      alert("Error al inscribirse al curso");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Curso no encontrado</h1>
          <p className="text-base-content/70">El curso que buscas no existe</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Hero con imagen */}
      <div className="relative">
        {course.coverImageUrl ? (
          <div
            className="h-96 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${course.coverImageUrl})` }}
          >
            <div className="absolute inset-0 bg-black/50" />
          </div>
        ) : (
          <div className="h-96 bg-gradient-to-r from-primary to-secondary relative" />
        )}

        {/* Botón de inscripción flotante */}
        {enrollmentStatus === "open" && !isEnrolled && user?.role === "student" && (
          <div className="absolute top-4 right-4">
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="btn btn-error btn-lg text-white shadow-2xl gap-2"
            >
              {enrolling ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Inscribiendo...
                </>
              ) : (
                <>
                  <IconCheck size={24} />
                  Inscribirse Ahora
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="max-w-6xl mx-auto px-4 -mt-32 relative z-10">
        {/* Card principal del curso */}
        <div className="card bg-base-100 shadow-2xl mb-6">
          <div className="card-body">
            <h1 className="text-5xl font-bold mb-4">{course.title}</h1>
            <p className="text-xl text-base-content/80 mb-6">{course.description}</p>

            {/* Badges de estado */}
            <div className="flex flex-wrap gap-3 mb-6">
              {course.difficulty && (
                <div className="badge badge-lg badge-primary text-white">
                  {course.difficulty === "beginner"
                    ? "Principiante"
                    : course.difficulty === "intermediate"
                    ? "Intermedio"
                    : "Avanzado"}
                </div>
              )}
              {isEnrolled && (
                <div className="badge badge-lg badge-success text-white gap-2">
                  <IconCheck size={16} />
                  Inscrito
                </div>
              )}
              {enrollmentStatus === "open" && !isEnrolled && (
                <div className="badge badge-lg badge-info text-white">
                  Inscripciones Abiertas
                </div>
              )}
              {enrollmentStatus === "closed" && (
                <div className="badge badge-lg badge-error text-white">
                  Inscripciones Cerradas
                </div>
              )}
              {enrollmentStatus === "upcoming" && (
                <div className="badge badge-lg badge-warning text-white">
                  Próximamente
                </div>
              )}
            </div>

            {/* Información del curso */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {course.durationMinutes && (
                <div className="flex items-center gap-3">
                  <IconClock size={24} className="text-primary" />
                  <div>
                    <p className="text-sm text-base-content/60">Duración</p>
                    <p className="font-semibold">{course.durationMinutes} minutos</p>
                  </div>
                </div>
              )}
              {lessons.length > 0 && (
                <div className="flex items-center gap-3">
                  <IconBook size={24} className="text-primary" />
                  <div>
                    <p className="text-sm text-base-content/60">Lecciones</p>
                    <p className="font-semibold">{lessons.length} lecciones</p>
                  </div>
                </div>
              )}
              {course.startDate && (
                <div className="flex items-center gap-3">
                  <IconCalendar size={24} className="text-primary" />
                  <div>
                    <p className="text-sm text-base-content/60">Inicia</p>
                    <p className="font-semibold">
                      {new Date(course.startDate).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Alerta de inscripción */}
            {!user && enrollmentStatus === "open" && (
              <div className="alert alert-info text-white">
                <IconAlertCircle size={24} />
                <span>Debes iniciar sesión como estudiante para inscribirte</span>
              </div>
            )}

            {user && user.role !== "student" && enrollmentStatus === "open" && (
              <div className="alert alert-warning">
                <IconAlertCircle size={24} />
                <span>Solo los estudiantes pueden inscribirse a cursos</span>
              </div>
            )}

            {enrollmentStatus === "upcoming" && course.enrollmentStartDate && (
              <div className="alert alert-info text-white">
                <IconCalendar size={24} />
                <span>
                  Las inscripciones abren el{" "}
                  {new Date(course.enrollmentStartDate).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}

            {enrollmentStatus === "closed" && !course.unlimitedEnrollment && (
              <div className="alert alert-error text-white">
                <IconAlertCircle size={24} />
                <span>Las inscripciones para este curso han cerrado</span>
              </div>
            )}
          </div>
        </div>

        {/* Grid de contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Columna principal - Lecciones */}
          <div className="lg:col-span-2">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-4">Contenido del Curso</h2>
                {lessons.length > 0 ? (
                  <div className="space-y-2">
                    {lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-4 p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{lesson.title}</h3>
                          {lesson.description && (
                            <p className="text-sm text-base-content/70">{lesson.description}</p>
                          )}
                        </div>
                        {lesson.durationMinutes && (
                          <div className="text-sm text-base-content/60">
                            {lesson.durationMinutes} min
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-base-content/60">No hay lecciones disponibles aún</p>
                )}
              </div>
            </div>
          </div>

          {/* Columna lateral - Ponentes */}
          <div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title mb-4 flex items-center gap-2">
                  <IconUsers size={24} />
                  {speakers.length === 1 ? "Ponente" : "Ponentes"}
                </h3>
                <div className="space-y-4">
                  {speakers.map((speaker) => (
                    <a
                      key={speaker.id}
                      href={`/profile/${speaker.id}`}
                      className="flex items-center gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                    >
                      <div className="avatar">
                        <div className="w-12 rounded-full">
                          {speaker.avatarUrl ? (
                            <img src={speaker.avatarUrl} alt={speaker.name} />
                          ) : (
                            <div className="bg-primary text-primary-content flex items-center justify-center text-xl font-bold">
                              {speaker.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{speaker.name}</p>
                        {speaker.bio && (
                          <p className="text-xs text-base-content/70 line-clamp-2">
                            {speaker.bio}
                          </p>
                        )}
                      </div>
                      <IconChevronRight size={20} className="text-base-content/40" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Botón de inscripción en sidebar */}
            {enrollmentStatus === "open" && !isEnrolled && user?.role === "student" && (
              <div className="card bg-base-100 shadow-xl mt-6">
                <div className="card-body">
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="btn btn-error btn-block text-white gap-2"
                  >
                    {enrolling ? (
                      <>
                        <span className="loading loading-spinner"></span>
                        Inscribiendo...
                      </>
                    ) : (
                      <>
                        <IconCheck size={20} />
                        Inscribirse al Curso
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {isEnrolled && (
              <div className="card bg-success text-success-content shadow-xl mt-6">
                <div className="card-body">
                  <div className="flex items-center gap-2 mb-2">
                    <IconCheck size={24} />
                    <h3 className="font-bold">Ya estás inscrito</h3>
                  </div>
                  <p className="text-sm mb-4">Accede al curso desde tu dashboard</p>
                  <button
                    onClick={() => router.push("/dashboard/enrolled-courses")}
                    className="btn btn-sm bg-white text-success hover:bg-base-200"
                  >
                    Ir a Mis Cursos
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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
                onClick={() => router.push(`/dashboard/student/courses/${course.id}`)}
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
