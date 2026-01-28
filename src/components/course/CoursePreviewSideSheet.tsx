"use client";

import { useEffect, useState } from "react";
import { Course } from "@/types/course";
import { IconX, IconBook, IconCalendar, IconUser, IconListDetails, IconClock, IconUsers } from "@tabler/icons-react";
import RichTextContent from "@/components/ui/RichTextContent";
import { Loader } from "@/components/common/Loader";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { capitalizeText } from "@/lib/utils";

interface CoursePreviewSideSheetProps {
  courseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (courseId: string) => void;
  enrolling?: boolean;
}

const COLORS = {
  primary: "#192170",
  secondary: "#3C1970",
  background: "#F1F5F9",
  surface: "#FFFFFF",
  text: {
    primary: "#111827",
    secondary: "#4B5563",
    muted: "#9CA3AF",
  },
  accent: {
    primarySoft: "#E8EAF6",
    border: "rgba(15,23,42,0.10)",
  },
};

export default function CoursePreviewSideSheet({
  courseId,
  isOpen,
  onClose,
  onEnroll,
  enrolling = false,
}: CoursePreviewSideSheetProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState<number>(0);
  const [topbarHeight, setTopbarHeight] = useState(0);

  // Calcular altura del topbar y bloquear scroll del main content
  useEffect(() => {
    if (!isOpen) {
      // Restaurar scroll cuando se cierra
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.style.overflow = '';
      }
      return;
    }

    // Bloquear scroll del main content cuando está abierto
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.style.overflow = 'hidden';
    }

    // Calcular altura del topbar
    const topbar = document.querySelector<HTMLElement>('[data-dashboard-topbar]');
    if (!topbar) {
      setTopbarHeight(0);
      return;
    }

    const update = () => setTopbarHeight(Math.ceil(topbar.getBoundingClientRect().height));
    update();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(topbar);

    return () => {
      observer.disconnect();
      // Restaurar scroll al desmontar
      if (mainContent) {
        mainContent.style.overflow = '';
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !courseId) {
      setCourse(null);
      setLessons([]);
      setSpeakers([]);
      setEnrolledCount(0);
      return;
    }

    const loadCourseData = async () => {
      setLoading(true);
      try {
        // Cargar información del curso usando la API de preview para estudiantes
        // Este endpoint ya incluye: curso, lecciones, speakers y enrolledCount
        const courseRes = await fetch(`/api/student/getCoursePreview?courseId=${courseId}`);

        if (courseRes.ok) {
          const courseData = await courseRes.json();

          // Establecer curso
          setCourse(courseData.course);

          // Establecer lecciones
          setLessons(courseData.lessons || []);

          // Establecer speakers directamente desde la respuesta (ya no hacemos N+1 calls)
          setSpeakers(courseData.speakers || []);

          // Establecer número de inscritos
          setEnrolledCount(courseData.enrolledCount || 0);
        } else {
          // Si falla la API de preview, intentar con el repositorio como fallback
          try {
            const allCourses = await courseRepository.findAll();
            const loadedCourse = allCourses.find(c => c.id === courseId) || null;
            if (loadedCourse) {
              setCourse(loadedCourse);
            }
          } catch (error) {
            console.error("Error loading course from repository:", error);
          }
        }
      } catch (error) {
        console.error("Error loading course data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [isOpen, courseId]);

  const formatDateTimeLocal = (dateString: string) => {
    const dateObj = new Date(dateString);
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();
    const day = dateObj.getUTCDate();
    const hours = dateObj.getUTCHours();
    const minutes = dateObj.getUTCMinutes();
    const localDate = new Date(year, month, day, hours, minutes);

    return {
      date: localDate.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: localDate.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const formatCreatedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const parseLessonContent = (lesson: any) => {
    // Primero intentar usar las subsecciones ya parseadas de la API
    if (lesson.subsections && Array.isArray(lesson.subsections) && lesson.subsections.length > 0) {
      return { subsections: lesson.subsections };
    }

    // Si no hay subsecciones parseadas, intentar parsear el contenido
    if (lesson.parsedContent && lesson.parsedContent.subsections) {
      return lesson.parsedContent;
    }

    // Fallback: parsear desde el string de contenido
    if (!lesson.content) return null;
    try {
      const parsed = typeof lesson.content === 'string' ? JSON.parse(lesson.content) : lesson.content;
      if (parsed && parsed.subsections && Array.isArray(parsed.subsections)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  const getTotalSubsections = () => {
    let total = 0;
    lessons.forEach(lesson => {
      const content = parseLessonContent(lesson);
      if (content && content.subsections) {
        total += content.subsections.length;
      }
    });
    return total;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - fixed debajo del topbar */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        style={{ top: topbarHeight ? `${topbarHeight}px` : 0 }}
        onClick={onClose}
      />

      {/* Side Sheet - fixed debajo del topbar, altura completa */}
      <div
        className="fixed right-0 w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col"
        style={{
          top: topbarHeight ? `${topbarHeight}px` : 0,
          height: topbarHeight ? `calc(100dvh - ${topbarHeight}px)` : '100dvh',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: COLORS.accent.border }}>
          <h2 className="text-xl font-bold" style={{ color: COLORS.primary }}>
            Vista Previa del Curso
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <IconX size={24} style={{ color: COLORS.text.secondary }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader />
            </div>
          ) : course ? (
            <div className="p-6">
              {/* Cover Image */}
              {course.coverImageUrl && (
                <div className="w-full h-48 rounded-xl overflow-hidden mb-6">
                  <img
                    src={course.coverImageUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title */}
              <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                {capitalizeText(course.title)}
              </h1>

              {/* Description */}
              {course.description && (
                <div className="mb-6">
                  <RichTextContent html={course.description} />
                </div>
              )}

              {/* Meta Information */}
              <div className="space-y-4 mb-6">
                {/* Instructores */}
                {speakers.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: COLORS.accent.primarySoft }}
                    >
                      <IconUser size={20} style={{ color: COLORS.primary }} />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: COLORS.text.muted }}>
                        {speakers.length === 1 ? 'Instructor' : 'Instructores'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {speakers.map((speaker, idx) => (
                          <span
                            key={speaker.id || idx}
                            className="text-sm font-medium"
                            style={{ color: COLORS.text.primary }}
                          >
                            {speaker.name} {speaker.lastName || ''}
                            {idx < speakers.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Fecha de inicio */}
                {course.startDate && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: COLORS.accent.primarySoft }}
                    >
                      <IconCalendar size={20} style={{ color: COLORS.primary }} />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: COLORS.text.muted }}>
                        Fecha de inicio
                      </p>
                      <p className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
                        {formatDateTimeLocal(course.startDate).date}
                      </p>
                    </div>
                  </div>
                )}

                {/* Fecha de creación */}
                {course.createdAt && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: COLORS.accent.primarySoft }}
                    >
                      <IconClock size={20} style={{ color: COLORS.primary }} />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: COLORS.text.muted }}>
                        Fecha de creación
                      </p>
                      <p className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
                        {formatCreatedDate(course.createdAt)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Contenido */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: COLORS.accent.primarySoft }}
                  >
                    <IconListDetails size={20} style={{ color: COLORS.primary }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: COLORS.text.muted }}>
                      Contenido
                    </p>
                    <p className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
                      {lessons.length} {lessons.length === 1 ? 'sección' : 'secciones'}
                      {getTotalSubsections() > 0 && ` · ${getTotalSubsections()} lecciones`}
                    </p>
                  </div>
                </div>

                {/* Usuarios inscritos */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: COLORS.accent.primarySoft }}
                  >
                    <IconUsers size={20} style={{ color: COLORS.primary }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: COLORS.text.muted }}>
                      Inscritos
                    </p>
                    <p className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
                      {enrolledCount} {enrolledCount === 1 ? 'estudiante' : 'estudiantes'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lessons List */}
              {lessons.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.text.primary }}>
                    Contenido del Curso
                  </h3>
                  <div className="space-y-2">
                    {lessons.map((lesson, index) => {
                      const lessonContent = parseLessonContent(lesson);
                      const subsections = lessonContent?.subsections || [];
                      const subsectionsCount = subsections.length;

                      // Debug logging para todas las lecciones
                      console.log(`[CoursePreviewSideSheet] Rendering lesson ${index + 1}:`, {
                        id: lesson.id,
                        title: lesson.title,
                        hasContent: !!lesson.content,
                        hasSubsections: !!lesson.subsections,
                        subsectionsLength: lesson.subsections?.length || 0,
                        hasParsedContent: !!lesson.parsedContent,
                        parsedSubsections: lesson.parsedContent?.subsections?.length || 0,
                        finalSubsectionsCount: subsectionsCount,
                        contentPreview: lesson.content ? lesson.content.substring(0, 100) : 'no content'
                      });

                      return (
                        <div
                          key={lesson.id}
                          className="p-4 rounded-lg border"
                          style={{ borderColor: COLORS.accent.border }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: COLORS.accent.primarySoft }}
                            >
                              <IconBook size={16} style={{ color: COLORS.primary }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="text-xs font-medium px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: COLORS.accent.primarySoft,
                                    color: COLORS.primary,
                                  }}
                                >
                                  Sección {index + 1}
                                </span>
                              </div>
                              <h4 className="font-semibold text-sm" style={{ color: COLORS.text.primary }}>
                                {lesson.title}
                              </h4>
                              {subsectionsCount > 0 ? (
                                <div className="mt-2">
                                  <p className="text-xs mb-1.5 font-medium" style={{ color: COLORS.text.muted }}>
                                    {subsectionsCount} {subsectionsCount === 1 ? 'lección' : 'lecciones'}:
                                  </p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {subsections.map((subsection: any, subIndex: number) => (
                                      <li
                                        key={subsection.id || `sub-${lesson.id}-${subIndex}`}
                                        className="text-xs ml-2"
                                        style={{ color: COLORS.text.secondary }}
                                      >
                                        {subsection.title || `Lección ${subIndex + 1}`}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <p className="text-xs mt-1 italic" style={{ color: COLORS.text.muted }}>
                                  Sin lecciones disponibles
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-sm" style={{ color: COLORS.text.muted }}>
                    No hay secciones disponibles para este curso.
                  </p>
                </div>
              )}

              {/* Enroll Button */}
              <div className="sticky bottom-0 bg-white border-t pt-4 mt-6" style={{ borderColor: COLORS.accent.border }}>
                <button
                  onClick={() => courseId && onEnroll(courseId)}
                  disabled={enrolling || !courseId}
                  className="w-full py-3 px-6 rounded-full font-semibold text-white transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {enrolling ? 'Inscribiendo...' : 'Inscribirse al Curso'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p style={{ color: COLORS.text.muted }}>No se pudo cargar la información del curso</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
