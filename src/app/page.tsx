"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validators/userSchema";
import { APP_NAME } from "@/utils/constants";
import { CourseCarousel } from "@/components/CourseCarousel";
import { Course } from "@/types/course";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

/**
 * Obtiene la ruta de redirección según el rol del usuario.
 */
function getRedirectByRole(role: string | undefined): string {
  switch (role) {
    case "admin":
    case "superadmin":
      return "/dashboard";
    case "teacher":
    case "speaker":
      return "/dashboard/my-courses";
    case "support":
      return "/dashboard/support";
    case "student":
    default:
      return "/dashboard";
  }
}

export default function HomePage() {
  const router = useRouter();
  const { signIn, rateLimitStatus, refreshRateLimitStatus, user, session, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authTimeout, setAuthTimeout] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  // Cargar cursos publicados para el carrusel
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        // Obtener cursos publicados (máximo 10 para el carrusel)
        const publishedCourses = await courseRepository.findPublished();
        // Filtrar solo los que tienen imagen de portada
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

  // Redirigir usuarios ya logueados al dashboard
  useEffect(() => {
    if (!authLoading && (user || session) && !isRedirecting) {
      setIsRedirecting(true);
      const redirectPath = getRedirectByRole(user?.role);
      window.location.href = redirectPath;
    }
  }, [authLoading, user, session, isRedirecting]);
  
  // Timeout de seguridad
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading && !isRedirecting) {
        setAuthTimeout(true);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [authLoading, isRedirecting]);
  
  // Verificar rate limit cuando el componente monta
  useEffect(() => {
    refreshRateLimitStatus();
  }, [refreshRateLimitStatus]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = useCallback(async (data: LoginInput) => {
    if (loading || isRedirecting) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const authenticatedUser = await signIn(data.email, data.password);
      
      setIsRedirecting(true);
      
      const redirectPath = getRedirectByRole(authenticatedUser.role);
      window.location.href = redirectPath;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
      setLoading(false);
    }
  }, [loading, isRedirecting, signIn]);
  
  const isAuthenticated = !!(user || session);
  const shouldShowLoader = isRedirecting || isAuthenticated || (authLoading && !authTimeout);
  
  if (shouldShowLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        {isRedirecting && (
          <p className="text-base-content/60 mt-4 absolute bottom-1/3">Redirigiendo...</p>
        )}
      </div>
    );
  }
  
  const isBlocked = !rateLimitStatus.allowed;

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
          {/* Logo y título */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">{APP_NAME}</h1>
            <p className="text-sm text-base-content/60 mb-6">Plataforma de Microcredenciales</p>
            <h2 className="text-2xl font-bold text-base-content">Bienvenido de vuelta</h2>
            <p className="text-base-content/70 mt-2">Inicia sesión en tu cuenta para continuar</p>
          </div>

          {/* Alerta de rate limiting */}
          {isBlocked && (
            <div className="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Cuenta bloqueada temporalmente. Intenta de nuevo en {rateLimitStatus.waitTimeFormatted}.</span>
            </div>
          )}
          
          {/* Alerta de error general */}
          {error && !isBlocked && (
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          {/* Indicador de intentos restantes */}
          {!isBlocked && rateLimitStatus.remainingAttempts <= 2 && rateLimitStatus.remainingAttempts > 0 && (
            <div className="alert alert-info mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Te quedan {rateLimitStatus.remainingAttempts} intento{rateLimitStatus.remainingAttempts === 1 ? '' : 's'}.</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <fieldset disabled={loading || isSubmitting || isBlocked} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Correo electrónico</span>
                </label>
                <input
                  type="email"
                  {...register("email")}
                  className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
                  placeholder="tu@ejemplo.com"
                  autoComplete="email"
                  autoFocus
                />
                {errors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.email.message}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Contraseña</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className={`input input-bordered w-full pr-12 ${errors.password ? 'input-error' : ''}`}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                    tabIndex={-1}
                  >
                    {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.password.message}</span>
                  </label>
                )}
                <label className="label">
                  <span className="label-text-alt"></span>
                  <Link href="/auth/recover-password" className="label-text-alt link link-hover" tabIndex={-1}>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" className="checkbox checkbox-primary" />
                  <span className="label-text">Recordarme</span>
                </label>
              </div>
            </fieldset>

            <button 
              type="submit" 
              className="btn btn-primary w-full text-white mt-6" 
              disabled={loading || isSubmitting || isBlocked}
            >
              {loading || isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          <div className="divider my-6">O</div>

          <div className="text-center space-y-4">
            <p className="text-base-content/70">
              ¿No tienes una cuenta?{" "}
              <Link href="/auth/sign-up" className="link link-primary font-semibold">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
