/**
 * Home Page - Login con Carrusel de Cursos
 * MicroCert by Marca UNACH
 *
 * Página de inicio que muestra el formulario de login junto con
 * un carrusel de cursos disponibles.
 *
 * ACTUALIZADO: Usa el nuevo LoginForm con Server Actions.
 * NOTA: El middleware maneja la redirección de usuarios autenticados,
 * por lo que esta página solo se muestra a usuarios no autenticados.
 */

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { APP_NAME } from "@/utils/constants";
import { CourseCarousel } from "@/components/CourseCarousel";
import { LoginForm } from "@/components/auth";
import { Course } from "@/types/course";
import { courseRepository } from "@/lib/repositories/courseRepository";

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Cargar cursos publicados para el carrusel
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        const publishedCourses = await courseRepository.findPublished();
        const coursesWithImages = publishedCourses
          .filter(course => course.coverImageUrl)
          .slice(0, 10);
        setCourses(coursesWithImages);
      } catch (err) {
        console.error("Error cargando cursos para carrusel:", err);
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, []);

  // Handler cuando el login es exitoso
  const handleLoginSuccess = () => {
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo: Carrusel de cursos */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900">
        {loadingCourses ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="loading loading-spinner loading-lg text-white"></div>
          </div>
        ) : (
          <CourseCarousel courses={courses} autoPlayInterval={5000} />
        )}
      </div>

      {/* Panel derecho: Formulario de login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-4 md:p-8">
        <div className="w-full max-w-md">
          {/* Logos UNACH */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Image
              src="/images/logos/logo_unach_azul_sin_fondo.png"
              alt="Logo UNACH"
              width={180}
              height={60}
              priority
              className="h-16 w-auto object-contain"
            />
            <Image
              src="/images/logos/marca_unach.png"
              alt="Marca UNACH"
              width={120}
              height={60}
              priority
              className="h-16 w-auto object-contain"
            />
          </div>

          {/* Logo y título */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">{APP_NAME}</h1>
            <p className="text-sm text-base-content/60 mb-6">Plataforma de Microcredenciales</p>
            <h2 className="text-2xl font-bold text-base-content">Bienvenido de vuelta</h2>
            <p className="text-base-content/70 mt-2">Inicia sesión en tu cuenta para continuar</p>
          </div>

          {/* Formulario de Login (usa Server Actions) */}
          <LoginForm onSuccess={handleLoginSuccess} />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
