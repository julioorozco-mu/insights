"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { lessonRepository } from "@/lib/repositories/lessonRepository";
import { userRepository } from "@/lib/repositories/userRepository";
import { Loader } from "@/components/common/Loader";
import { IconBook, IconPlayerPlay, IconClock, IconUsers, IconStar, IconStarFilled, IconCalendar } from "@tabler/icons-react";
import { stripHtmlAndTruncate } from "@/lib/utils";

interface Speaker {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  avatarUrl?: string;
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
  const [loading, setLoading] = useState(true);
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
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/dashboard/student/courses/${course.id}`}
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
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
                  <button className="btn btn-primary text-white w-full">
                    Continuar →
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
