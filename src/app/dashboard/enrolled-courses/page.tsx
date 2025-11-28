"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader } from "@/components/common/Loader";
import { IconBook, IconPlayerPlay, IconClock, IconUsers } from "@tabler/icons-react";

interface Course {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  speakerName?: string;
  lessonIds?: string[];
  createdAt: any;
}

interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: any;
}

export default function EnrolledCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadEnrolledCourses = async () => {
      if (!user) return;

      try {
        // Obtener inscripciones del estudiante
        const enrollmentsQuery = query(
          collection(db, "enrollments"),
          where("studentId", "==", user.id)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        
        const enrollments: Enrollment[] = enrollmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Enrollment));

        // Obtener información de cada curso
        const coursesPromises = enrollments.map(async (enrollment) => {
          const courseDoc = await getDoc(doc(db, "courses", enrollment.courseId));
          if (courseDoc.exists()) {
            return {
              id: courseDoc.id,
              ...courseDoc.data(),
            } as Course;
          }
          return null;
        });

        const coursesData = (await Promise.all(coursesPromises)).filter(
          (course): course is Course => course !== null
        );

        setCourses(coursesData);
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
                    {course.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm text-base-content/60 mt-2">
                  {course.speakerName && (
                    <div className="flex items-center gap-1">
                      <IconUsers size={16} />
                      <span>{course.speakerName}</span>
                    </div>
                  )}
                  {course.lessonIds && (
                    <div className="flex items-center gap-1">
                      <IconPlayerPlay size={16} />
                      <span>{course.lessonIds.length} lecciones</span>
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
