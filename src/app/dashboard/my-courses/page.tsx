"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { Course } from "@/types/course";
import { Loader } from "@/components/common/Loader";
import { formatDate } from "@/utils/formatDate";
import { IconBook, IconUsers, IconClock } from "@tabler/icons-react";

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadMyCourses = async () => {
      if (!user) return;

      try {
        // Primero intentar buscar por ID de usuario (si coincide con speaker)
        let data = await courseRepository.findBySpeaker(user.id);
        
        // Si no encuentra cursos, intentar buscar por email
        if (data.length === 0 && user.email) {
          data = await courseRepository.findBySpeakerEmail(user.email);
        }
        
        setCourses(data);
      } catch (error) {
        console.error("Error loading my courses:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMyCourses();
  }, [user]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Mis Cursos</h1>
          <p className="text-base-content/70">
            Cursos donde eres ponente o co-host
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="stats shadow w-full mb-8">
        <div className="stat">
          <div className="stat-figure text-primary">
            <IconBook size={32} />
          </div>
          <div className="stat-title">Total de Cursos</div>
          <div className="stat-value text-primary">{courses.length}</div>
          <div className="stat-desc">Asignados como ponente o co-host</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <IconBook size={32} />
          </div>
          <div className="stat-title">Cursos Activos</div>
          <div className="stat-value text-secondary">
            {courses.filter(c => c.isActive).length}
          </div>
          <div className="stat-desc">Publicados</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <IconUsers size={32} />
          </div>
          <div className="stat-title">Lecciones</div>
          <div className="stat-value text-accent">
            {courses.reduce((acc, c) => acc + (c.lessonIds?.length || 0), 0)}
          </div>
          <div className="stat-desc">Total en todos los cursos</div>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-primary mb-4 flex justify-center">
              <IconBook size={64} stroke={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">No tienes cursos asignados</h2>
            <p className="text-base-content/70 mb-4">
              Aún no has sido asignado como ponente o co-host en ningún curso.
              Contacta al administrador para que te asigne a cursos o lecciones.
            </p>
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
                
                <div className="flex items-center gap-2 mt-2">
                  {course.isActive ? (
                    <div className="badge badge-success">Activo</div>
                  ) : (
                    <div className="badge badge-ghost">Inactivo</div>
                  )}
                  <div className="badge badge-outline">
                    {course.lessonIds?.length || 0} lecciones
                  </div>
                </div>

                {course.durationMinutes && (
                  <div className="flex items-center gap-2 text-sm text-base-content/60 mt-2">
                    <IconClock size={16} />
                    {Math.floor(course.durationMinutes / 60)} horas
                  </div>
                )}

                <div className="text-xs text-base-content/50 mt-2">
                  Creado: {formatDate(course.createdAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
