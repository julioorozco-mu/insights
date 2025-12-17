"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { lessonRepository } from "@/lib/repositories/lessonRepository";
import { Loader } from "@/components/common/Loader";
import { IconBook, IconPlayerPlay, IconClock, IconUsers, IconStar, IconStarFilled } from "@tabler/icons-react";

// Función para extraer texto plano de HTML (para previews)
function stripHtml(html: string): string {
  if (!html) return "";
  // Reemplazar tags de bloque y saltos de línea por espacios
  let text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  speakerName?: string;
  lessonCount: number;
  createdAt: any;
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
              lessonCount: activeLessons.length,
              createdAt: course.createdAt,
            } as Course;
          }
          return null;
        });

        const coursesData = (await Promise.all(coursesPromises)).filter(
          (course): course is Course => course !== null
        );

        setCourses(coursesData);

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
              <figure className="aspect-video bg-base-300">
                {course.coverImageUrl ? (
                  <img
                    src={course.coverImageUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <IconBook size={64} className="opacity-50" />
                  </div>
                )}
              </figure>
              <div className="card-body">
                <h2 className="card-title">{course.title}</h2>
                {course.description && (
                  <p className="text-sm text-base-content/70 line-clamp-2">
                    {stripHtml(course.description)}
                  </p>
                )}
                
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

                <div className="flex items-center gap-2 text-sm text-base-content/60 mt-2">
                  {course.speakerName && (
                    <div className="flex items-center gap-1">
                      <IconUsers size={16} />
                      <span>{course.speakerName}</span>
                    </div>
                  )}
                  {course.lessonCount > 0 && (
                    <div className="flex items-center gap-1">
                      <IconPlayerPlay size={16} />
                      <span>{course.lessonCount} {course.lessonCount === 1 ? 'lección' : 'lecciones'}</span>
                    </div>
                  )}
                </div>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-primary btn-sm text-white">
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
