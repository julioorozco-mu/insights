"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { lessonRepository } from "@/lib/repositories/lessonRepository";
import { userRepository } from "@/lib/repositories/userRepository";
import { Loader } from "@/components/common/Loader";
import { IconBook, IconPlayerPlay, IconClock, IconUsers, IconStar, IconStarFilled, IconCalendar, IconChevronDown } from "@tabler/icons-react";
import { stripHtmlAndTruncate } from "@/lib/utils";

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

interface CourseProgress {
  progress: number;
  completedLessons: string[];
  subsectionProgress: Record<string, number>;
  totalLessons: number;
  lessons: LessonProgress[];
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

export default function EnrolledCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [speakers, setSpeakers] = useState<Map<string, Speaker>>(new Map());
  const [courseRatings, setCourseRatings] = useState<Map<string, CourseRating>>(new Map());
  const [courseProgress, setCourseProgress] = useState<Map<string, CourseProgress>>(new Map());
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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

  // Función para renderizar las estrellas
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <IconStarFilled key={i} size={14} className="text-yellow-500" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <IconStar size={14} className="text-yellow-500" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <IconStarFilled size={14} className="text-yellow-500" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <IconStar key={i} size={14} className="text-yellow-500" />
        );
      }
    }
    return stars;
  };

  const getCourseRating = (courseId: string): CourseRating => {
    return courseRatings.get(courseId) || { averageRating: 0, reviewsCount: 0 };
  };

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
        } catch {}
        
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
      
      return {
        progress: progressData.progress || 0,
        completedLessons: progressData.completedLessons || [],
        subsectionProgress: progressData.subsectionProgress || {},
        totalLessons: progressData.totalLessons || lessons.length,
        lessons: lessonProgressList,
      };
    } catch (error) {
      console.error(`Error fetching progress for course ${courseId}:`, error);
      return null;
    }
  };

  const getProgress = (courseId: string): CourseProgress | null => {
    return courseProgress.get(courseId) || null;
  };

  useEffect(() => {
    const loadEnrolledCourses = async () => {
      if (!user) return;

      try {
        // Obtener inscripciones del estudiante usando API student (sesión)
        const enrollmentsRes = await fetch(`/api/student/getEnrollments`);
        
        if (!enrollmentsRes.ok) {
          setCourses([]);
          return;
        }

        const enrollmentsData = await enrollmentsRes.json();
        const enrollments: Enrollment[] = enrollmentsData.enrollments || [];
        
        if (enrollments.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }

        // Obtener información de cada curso con conteo real de lecciones
        const coursesPromises = enrollments.map(async (enrollment) => {
          const course = await courseRepository.findById(enrollment.courseId);
          if (course) {
            // Obtener conteo real de lecciones desde la tabla lessons
            const lessons = await lessonRepository.findByCourseId(course.id);
            const activeLessons = lessons.filter(l => l.isActive !== false);
            
            return {
              id: course.id,
              title: course.title,
              description: course.description,
              coverImageUrl: course.coverImageUrl,
              speakerIds: course.speakerIds,
              lessonCount: activeLessons.length,
              createdAt: course.createdAt,
              startDate: course.startDate,
            } as Course;
          }
          return null;
        });

        const coursesData = (await Promise.all(coursesPromises)).filter(
          (course): course is Course => course !== null
        );

        setCourses(coursesData);

        // Cargar información de los speakers
        const speakerIds = new Set<string>();
        coursesData.forEach(course => {
          course.speakerIds?.forEach(id => speakerIds.add(id));
        });

        const speakersMap = new Map<string, Speaker>();
        for (const speakerId of speakerIds) {
          const userData = await userRepository.findById(speakerId);
          if (userData) {
            speakersMap.set(speakerId, {
              id: userData.id,
              name: userData.name,
              lastName: '',
              email: userData.email,
              avatarUrl: userData.avatarUrl,
            });
          }
        }
        setSpeakers(speakersMap);

        // Cargar ratings de todos los cursos
        const ratingsMap = new Map<string, CourseRating>();
        await Promise.all(
          coursesData.map(async (course) => {
            const rating = await fetchCourseRating(course.id);
            ratingsMap.set(course.id, rating);
          })
        );
        setCourseRatings(ratingsMap);

        // Cargar progreso de todos los cursos
        const progressMap = new Map<string, CourseProgress>();
        await Promise.all(
          coursesData.map(async (course) => {
            const progress = await fetchCourseProgress(course.id);
            if (progress) {
              progressMap.set(course.id, progress);
            }
          })
        );
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const progress = getProgress(course.id);
            const isExpanded = expandedCourses.has(course.id);
            
            return (
              <div
                key={course.id}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
              >
                <Link href={`/dashboard/student/courses/${course.id}`}>
                  <figure className="h-48 bg-base-300 relative">
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
                    {/* Badge de progreso total */}
                    {progress && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg">
                        <span className={`text-sm font-bold ${progress.progress === 100 ? 'text-green-600' : 'text-purple-600'}`}>
                          {progress.progress}%
                        </span>
                      </div>
                    )}
                  </figure>
                </Link>
                <div className="card-body">
                  <Link href={`/dashboard/student/courses/${course.id}`}>
                    <h2 className="card-title hover:text-primary transition-colors">{course.title}</h2>
                  </Link>
                  <p className="text-sm text-base-content/70 line-clamp-2">
                    {stripHtmlAndTruncate(course.description, 120)}
                  </p>
                  
                  {/* Barra de progreso total */}
                  {progress && (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-base-content/70">Progreso del curso</span>
                        <span className={`text-xs font-bold ${progress.progress === 100 ? 'text-green-600' : 'text-purple-600'}`}>
                          {progress.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-300 ${progress.progress === 100 ? 'bg-green-500' : 'bg-purple-600'}`}
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-base-content/60 mt-1">
                        {progress.completedLessons.length} de {progress.totalLessons} secciones completadas
                      </p>
                    </div>
                  )}

                  {/* Botón para expandir secciones */}
                  {progress && progress.lessons.length > 0 && (
                    <button
                      onClick={(e) => toggleCourseExpand(course.id, e)}
                      className="flex items-center justify-between w-full mt-2 py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        Ver progreso por sección
                      </span>
                      <IconChevronDown 
                        size={18} 
                        className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}

                  {/* Lista de secciones expandida */}
                  {isExpanded && progress && progress.lessons.length > 0 && (
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                      {progress.lessons.map((lesson, index) => {
                        const lessonProgress = lesson.totalSubsections > 0 
                          ? Math.round((lesson.completedSubsections / lesson.totalSubsections) * 100)
                          : 0;
                        
                        return (
                          <div key={lesson.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-medium text-gray-700 line-clamp-1 flex-1 pr-2">
                                {index + 1}. {lesson.title}
                              </span>
                              <span className={`text-xs font-bold shrink-0 ${lessonProgress === 100 ? 'text-green-600' : 'text-purple-600'}`}>
                                {lessonProgress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full transition-all duration-300 ${lessonProgress === 100 ? 'bg-green-500' : 'bg-purple-500'}`}
                                style={{ width: `${lessonProgress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {lesson.completedSubsections}/{lesson.totalSubsections} lecciones
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
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
                    <Link 
                      href={`/dashboard/student/courses/${course.id}`}
                      className="btn btn-primary text-white w-full"
                    >
                      {progress && progress.progress === 100 ? 'Revisar curso' : 'Continuar'} →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
