"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { IconLoader2 } from "@tabler/icons-react";

/**
 * Página de detalle del curso para estudiantes.
 * Redirige automáticamente al Lesson Player con la primera lección disponible.
 */
export default function StudentCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const courseId = params.courseId as string;

  useEffect(() => {
    const fetchAndRedirect = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      if (!courseId) {
        setError('ID de curso no válido');
        setLoading(false);
        return;
      }

      try {
        // Obtener las lecciones del curso
        const res = await fetch(`/api/student/getLessons?courseId=${courseId}&userId=${user.id}`);
        
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Error al cargar el curso');
          setLoading(false);
          return;
        }

        const data = await res.json();
        const lessons = data.lessons || [];

        if (lessons.length === 0) {
          setError('Este curso no tiene lecciones disponibles');
          setLoading(false);
          return;
        }

        // Ordenar por order y obtener la primera lección
        const sortedLessons = [...lessons].sort((a: any, b: any) => a.order - b.order);
        const firstLesson = sortedLessons[0];

        // Redirigir al Lesson Player con la primera lección
        router.replace(`/student/courses/${courseId}/learn/lecture/${firstLesson.id}`);
        
      } catch (err) {
        console.error('Error fetching course:', err);
        setError('Error al cargar el curso');
        setLoading(false);
      }
    };

    fetchAndRedirect();
  }, [courseId, user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="text-gray-600">Cargando curso...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/student/courses')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Volver a mis cursos
          </button>
        </div>
      </div>
    );
  }

  return null;
}
