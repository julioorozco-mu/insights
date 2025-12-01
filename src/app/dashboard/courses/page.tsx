"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { siteConfigRepository } from "@/lib/repositories/siteConfigRepository";
import { Course } from "@/types/course";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/common/Loader";
import { IconBook, IconPlus, IconCalendar, IconStar, IconX } from "@tabler/icons-react";
import { userRepository } from "@/lib/repositories/userRepository";
import { lessonRepository } from "@/lib/repositories/lessonRepository";

interface Speaker {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
}

interface LessonSummary {
  id: string;
  title: string;
  startDate?: string;
}

interface BannerSelectionItem {
  id: string;
  type: "course" | "lesson";
}

interface CourseWithSpeakers extends Course {
  speakers?: Speaker[];
  lessons?: LessonSummary[];
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithSpeakers[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [selectedBannerItems, setSelectedBannerItems] = useState<BannerSelectionItem[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadCourses = async () => {
      try {
        let data: Course[];
        if (user?.role === "admin") {
          // Admin ve todos los cursos
          data = await courseRepository.findAll();
        } else if (user?.role === "teacher") {
          // Teacher ve solo sus cursos
          data = await courseRepository.findByTeacher(user.id);
        } else {
          // Student ve solo cursos activos
          data = await courseRepository.findPublished();
        }
        
        // Cargar información de los ponentes para cada curso
        const coursesWithSpeakers = await Promise.all(
          data.map(async (course) => {
            const speakers: Speaker[] = [];
            const lessons: LessonSummary[] = [];
            
            // Cargar ponentes
            if (course.speakerIds && course.speakerIds.length > 0) {
              for (const speakerId of course.speakerIds) {
                try {
                  const userData = await userRepository.findById(speakerId);
                  if (userData) {
                    speakers.push({
                      id: speakerId,
                      name: userData.name || userData.email,
                      email: userData.email,
                      photoURL: userData.avatarUrl,
                    });
                  }
                } catch (error) {
                  console.error(`Error loading speaker ${speakerId}:`, error);
                }
              }
            }
            
            // Cargar lecciones
            if (course.lessonIds && course.lessonIds.length > 0) {
              const courseLessons = await lessonRepository.findByIds(course.lessonIds);
              for (const lesson of courseLessons) {
                lessons.push({
                  id: lesson.id,
                  title: lesson.title || `Lección ${lessons.length + 1}`,
                  startDate: lesson.startDate || lesson.scheduledStartTime,
                });
              }
            }
            
            return { ...course, speakers, lessons };
          })
        );
        
        setCourses(coursesWithSpeakers);
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setLoading(false);
      }
    };

    // Cargar cursos incluso si user es null (mostrará estado vacío)
    loadCourses();
    if (user?.role === "admin") {
      loadBannerConfig();
    }
  }, [user]);

  const loadBannerConfig = async () => {
    try {
      setBannerLoading(true);
      const config = await siteConfigRepository.getHomepageConfig();
      setSelectedBannerItems(config?.bannerItems || []);
    } catch (error) {
      console.error("Error loading homepage config:", error);
    } finally {
      setBannerLoading(false);
    }
  };

  const courseById = (courseId: string) => courses.find((course) => course.id === courseId);

  const toggleBannerCourse = (courseId: string) => {
    setBannerError(null);
    setSelectedBannerItems((prev) => {
      const exists = prev.some((item) => item.type === "course" && item.id === courseId);
      if (exists) {
        return prev.filter((item) => !(item.type === "course" && item.id === courseId));
      }

      const courseLessons = courseById(courseId)?.lessons?.map((lesson) => lesson.id) || [];
      const cleanedPrev = prev.filter(
        (item) => !(item.type === "lesson" && courseLessons.includes(item.id))
      );

      if (cleanedPrev.length >= 5) {
        setBannerError("Solo puedes seleccionar hasta 5 elementos para el banner.");
        return prev;
      }

      return [...cleanedPrev, { id: courseId, type: "course" }];
    });
  };

  const toggleBannerLesson = (courseId: string, lessonId: string) => {
    setBannerError(null);
    setSelectedBannerItems((prev) => {
      const exists = prev.some((item) => item.type === "lesson" && item.id === lessonId);
      if (exists) {
        return prev.filter((item) => !(item.type === "lesson" && item.id === lessonId));
      }

      const withoutCourse = prev.filter((item) => !(item.type === "course" && item.id === courseId));

      if (withoutCourse.length >= 5) {
        setBannerError("Solo puedes seleccionar hasta 5 elementos para el banner.");
        return prev;
      }

      return [...withoutCourse, { id: lessonId, type: "lesson" }];
    });
  };

  const handleSaveBannerCourses = async () => {
    try {
      setSavingBanner(true);
      setBannerError(null);
      await siteConfigRepository.saveHomepageConfig({
        bannerItems: selectedBannerItems,
      });
      setBannerSuccess(true);
      setTimeout(() => setBannerSuccess(false), 3000);
      setShowBannerModal(false);
    } catch (error) {
      console.error("Error saving homepage config:", error);
      setBannerError("No se pudieron guardar los cursos del banner. Intenta nuevamente.");
    } finally {
      setSavingBanner(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  const canCreateCourse = user?.role === "teacher" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const bannerLimitReached = selectedBannerItems.length >= 5;

  const courseIsSelected = (course: CourseWithSpeakers) =>
    selectedBannerItems.some((item) => item.type === "course" && item.id === course.id);

  const courseSelectedLessons = (course: CourseWithSpeakers) =>
    selectedBannerItems.filter(
      (item) =>
        item.type === "lesson" &&
        course.lessons?.some((lesson) => lesson.id === item.id)
    );

  const formatCourseDateRange = (start?: string, end?: string) => {
    if (!start && !end) {
      return null;
    }

    const formatDate = (value: string) =>
      new Date(value).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

    const formatTime = (value: string) =>
      new Date(value).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });

    if (!start) {
      return `Hasta ${formatDate(end!)} • ${formatTime(end!)}`;
    }

    if (!end) {
      return `${formatDate(start)} • ${formatTime(start)}`;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate.getTime() === endDate.getTime()) {
      return `${formatDate(start)} • ${formatTime(start)}`;
    }

    const sameDay =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate();

    if (sameDay) {
      return `${formatDate(start)} • ${formatTime(start)} - ${formatTime(end)}`;
    }

    return `Del ${formatDate(start)} ${formatTime(start)} al ${formatDate(end)} ${formatTime(end)}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-base-content">
            {canCreateCourse ? "Gestiona tus cursos" : "Explora los cursos disponibles"}
          </h1>
          {bannerSuccess && isAdmin && (
            <p className="mt-2 text-sm text-success">
              Configuración del banner guardada correctamente.
            </p>
          )}
        </div>
        {canCreateCourse && (
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                type="button"
                className="btn btn-outline gap-2"
                onClick={() => setShowBannerModal(true)}
                disabled={bannerLoading}
              >
                <IconStar size={20} />
                Cursos para el banner
              </button>
            )}
            <Link href="/dashboard/courses/new" className="btn btn-primary text-white gap-2">
              <IconPlus size={20} />
              Crear Curso
            </Link>
          </div>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-primary mb-4 flex justify-center">
              <IconBook size={64} stroke={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">No hay cursos disponibles</h2>
            <p className="text-base-content/70 mb-4">
              {canCreateCourse
                ? "Comienza creando tu primer curso"
                : "Vuelve pronto para ver nuevos cursos"}
            </p>
            {canCreateCourse && (
              <Link href="/dashboard/courses/new" className="btn btn-primary text-white gap-2">
                <IconPlus size={20} />
                Crear Primer Curso
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/dashboard/courses/${course.id}`}
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
            >
              <figure className="h-48 bg-base-300">
                {course.coverImageUrl ? (
                  <img src={course.coverImageUrl} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-primary">
                    <IconBook size={64} stroke={2} />
                  </div>
                )}
              </figure>
              <div className="card-body">
                <h2 className="card-title text-lg">{course.title}</h2>
                
                {/* Ponentes */}
                {course.speakers && course.speakers.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="avatar">
                      <div className="w-8 h-8 rounded-full">
                        {course.speakers[0].photoURL ? (
                          <img src={course.speakers[0].photoURL} alt={course.speakers[0].name} />
                        ) : (
                          <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full text-xs font-bold text-white">
                            {course.speakers[0].name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{course.speakers[0].name}</span>
                      {course.speakers.length > 1 && (
                        <span className="text-base-content/60 ml-1">
                          +{course.speakers.length - 1} {course.speakers.length === 2 ? 'Ponente' : 'Ponentes'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Fecha y hora del curso */}
                {(course.startDate || course.endDate) && (
                  <div className="flex items-center gap-2 text-sm text-base-content/70 mb-2">
                    <IconCalendar size={16} />
                    <span>{formatCourseDateRange(course.startDate, course.endDate)}</span>
                  </div>
                )}
                
                {/* Número de lecciones */}
                <div className="flex items-center gap-2 text-sm text-base-content/70">
                  <IconBook size={16} />
                  <span>{course.lessonIds?.length || 0} {(course.lessonIds?.length || 0) === 1 ? 'lección' : 'lecciones'}</span>
                </div>
                
                <div className="card-actions justify-end items-center mt-4">
                  {isAdmin && (courseIsSelected(course) || courseSelectedLessons(course).length > 0) && (
                    <div className="badge badge-info text-white">
                      {courseIsSelected(course)
                        ? "Curso en banner"
                        : `${courseSelectedLessons(course).length} lección${courseSelectedLessons(course).length === 1 ? "" : "es"} en banner`}
                    </div>
                  )}
                  {course.isActive ? (
                    <div className="badge badge-success text-white">Activo</div>
                  ) : (
                    <div className="badge badge-warning text-white">Inactivo</div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {isAdmin && showBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-base-100 w-full max-w-4xl rounded-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <IconStar size={24} /> Cursos para el banner
                </h2>
                <p className="text-base-content/70 text-sm">
                  Selecciona hasta 5 cursos para destacarlos en el banner de la página principal.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-circle"
                onClick={() => {
                  setShowBannerModal(false);
                  setBannerError(null);
                }}
              >
                <IconX size={20} />
              </button>
            </div>

            {bannerError && (
              <div className="px-6 pt-4">
                <div className="alert alert-error text-white">
                  <span>{bannerError}</span>
                </div>
              </div>
            )}

            <div className="px-6 pt-4 pb-6 max-h-[60vh] overflow-y-auto">
              {bannerLoading ? (
                <div className="flex justify-center py-12">
                  <span className="loading loading-spinner loading-lg" />
                </div>
              ) : (
                <div className="space-y-4">
                  {courses.map((course) => {
                    const isCourseSelected = courseIsSelected(course);
                    const selectedLessons = courseSelectedLessons(course);
                    return (
                      <div
                        key={course.id}
                        className={`border rounded-lg p-4 transition-colors ${
                          isCourseSelected || selectedLessons.length > 0 ? "border-primary bg-primary/5" : "border-base-300"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary mt-1"
                            checked={isCourseSelected}
                            onChange={() => toggleBannerCourse(course.id)}
                            disabled={!isCourseSelected && bannerLimitReached}
                          />
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-semibold">{course.title}</h3>
                                {course.speakers && course.speakers.length > 0 && (
                                  <p className="text-sm text-base-content/70 mt-1">
                                    {course.speakers[0].name}
                                    {course.speakers.length > 1 && ` +${course.speakers.length - 1} ponentes`}
                                  </p>
                                )}
                              </div>
                              <div className="w-full md:w-36 h-24 bg-base-200 rounded-md overflow-hidden">
                                {course.coverImageUrl ? (
                                  <img
                                    src={course.coverImageUrl}
                                    alt={course.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-primary">
                                    <IconBook size={36} />
                                  </div>
                                )}
                              </div>
                            </div>
                            {course.lessons && course.lessons.length > 0 && (
                              <div className="mt-4 space-y-2 bg-base-200/60 rounded-lg p-3">
                                <p className="text-sm font-medium text-base-content/70">Lecciones</p>
                                <div className="space-y-2">
                                  {course.lessons.map((lesson: LessonSummary) => {
                                    const lessonSelected = selectedLessons.some((item) => item.id === lesson.id);
                                    const disableLessonAdd = !lessonSelected && bannerLimitReached && !isCourseSelected;
                                    return (
                                      <label
                                        key={lesson.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                                          lessonSelected ? "border-primary bg-primary/10" : "border-transparent bg-base-100/70"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          className="checkbox checkbox-sm mt-1"
                                          checked={lessonSelected}
                                          onChange={() => toggleBannerLesson(course.id, lesson.id)}
                                          disabled={disableLessonAdd}
                                        />
                                        <div className="flex-1 text-sm">
                                          <p className="font-medium text-base-content">{lesson.title}</p>
                                          {lesson.startDate && (
                                            <p className="text-base-content/60">
                                              {new Date(lesson.startDate).toLocaleDateString('es-MX', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                              })}
                                              {' • '}
                                              {new Date(lesson.startDate).toLocaleTimeString('es-MX', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                              })}
                                            </p>
                                          )}
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-base-300 px-6 py-4">
              <p className="text-sm text-base-content/70">
                Seleccionados: <span className="font-semibold">{selectedBannerItems.length}</span> / 5
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowBannerModal(false);
                    setBannerError(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary text-white gap-2"
                  onClick={handleSaveBannerCourses}
                  disabled={savingBanner}
                >
                  {savingBanner && <span className="loading loading-spinner" />}
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
