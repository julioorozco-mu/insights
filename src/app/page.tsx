"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validators/userSchema";
import { useHomepageBanner } from "@/hooks/useHomepageBanner";
import { useEffect } from "react";
import { teacherRepository } from "@/lib/repositories/teacherRepository";
import { userRepository } from "@/lib/repositories/userRepository";

interface Speaker {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  bio?: string;
}

export default function HomePage() {
  const router = useRouter();
  const { signIn, user, session, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const { courses: bannerCourses, loading: bannerLoading } = useHomepageBanner();
  // Timeout de seguridad para evitar spinner infinito
  const [authTimeout, setAuthTimeout] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Redirigir usuarios logueados al dashboard (respaldo del middleware)
  // Usar session además de user para detectar más rápido
  useEffect(() => {
    if (!authLoading && (user || session) && !isRedirecting) {
      setIsRedirecting(true);
      // Usar window.location para forzar navegación completa en producción
      window.location.href = "/dashboard";
    }
  }, [authLoading, user, session, isRedirecting]);

  // Timeout de seguridad: si después de 3 segundos sigue cargando, mostrar la página
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading && !isRedirecting) {
        console.warn('[HomePage] Auth loading timeout - mostrando página pública');
        setAuthTimeout(true);
      }
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [authLoading, isRedirecting]);

  // Log cuando cambia el tooltip
  useEffect(() => {
    console.log('💡 Active tooltip changed to:', activeTooltip);
  }, [activeTooltip]);

  useEffect(() => {
    if (bannerCourses.length === 0) {
      setCurrentSlide(0);
    } else {
      setCurrentSlide((prev) => Math.min(prev, bannerCourses.length - 1));
    }
  }, [bannerCourses.length]);

  // Cerrar tooltip al tocar fuera (con delay para permitir que el click del avatar se procese primero)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      // No cerrar si se hace click en un avatar
      if (target.closest('.avatar-container')) {
        return;
      }
      if (activeTooltip) {
        console.log('🔴 Closing tooltip from outside click');
        setActiveTooltip(null);
      }
    };

    // Agregar listener con un pequeño delay
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeTooltip]);

  // Cargar ponentes del curso actual
  useEffect(() => {
    const loadSpeakers = async () => {
      const currentCourseData = bannerCourses[currentSlide];
      
      if (!currentCourseData) {
        setSpeakers([]);
        return;
      }

      // Primero verificar si ya vienen cargados desde useHomepageBanner
      if ((currentCourseData as any).speakers && (currentCourseData as any).speakers.length > 0) {
        setSpeakers((currentCourseData as any).speakers);
        return;
      }

      // Si no, cargar desde speakerIds
      if (!currentCourseData.speakerIds || currentCourseData.speakerIds.length === 0) {
        setSpeakers([]);
        return;
      }

      try {
        const speakerIds = currentCourseData.speakerIds;
        const loadedSpeakers: Speaker[] = [];

        for (const speakerId of speakerIds) {
          try {
            // Buscar en teachers primero, luego en users
            const teacher = await teacherRepository.findById(speakerId);
            if (teacher) {
              loadedSpeakers.push({
                id: speakerId,
                name: `${teacher.name || ''} ${teacher.lastName || ''}`.trim() || teacher.email || '',
                email: teacher.email || '',
                photoURL: teacher.avatarUrl,
                bio: teacher.bio,
              });
            } else {
              // Fallback a users
              const user = await userRepository.findById(speakerId);
              if (user) {
                loadedSpeakers.push({
                  id: speakerId,
                  name: `${user.name || ''} ${user.lastName || ''}`.trim() || user.email,
                  email: user.email,
                  photoURL: user.avatarUrl,
                  bio: user.bio,
                });
              }
            }
          } catch (err) {
            console.error(`Error loading speaker ${speakerId}:`, err);
          }
        }

        console.log('✅ Speakers loaded:', loadedSpeakers);
        setSpeakers(loadedSpeakers);
      } catch (err) {
        console.error('Error loading speakers:', err);
        setSpeakers([]);
      }
    };

    loadSpeakers();
  }, [bannerCourses, currentSlide]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    if (loading || isRedirecting) return;
    
    try {
      setLoading(true);
      setError(null);
      await signIn(data.email, data.password);
      
      // Marcar que estamos redirigiendo ANTES de navegar
      setIsRedirecting(true);
      // Usar window.location para forzar navegación completa en producción
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
      setLoading(false);
    }
    // No hacer setLoading(false) en éxito porque estamos redirigiendo
  };

  const totalSlides = bannerCourses.length;

  const nextSlide = () => {
    if (totalSlides === 0) return;
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    if (totalSlides === 0) return;
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const currentCourse = useMemo(() => {
    if (totalSlides === 0) return null;
    return bannerCourses[currentSlide];
  }, [bannerCourses, currentSlide, totalSlides]);

  const eventStartLabel = useMemo(() => {
    if (!currentCourse?.startDate) {
      return null;
    }

    // Convertir de UTC a hora local correctamente
    const utcDate = new Date(currentCourse.startDate);
    const year = utcDate.getUTCFullYear();
    const month = utcDate.getUTCMonth();
    const day = utcDate.getUTCDate();
    const hours = utcDate.getUTCHours();
    const minutes = utcDate.getUTCMinutes();
    const localDate = new Date(year, month, day, hours, minutes);
    
    const datePart = localDate.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timePart = localDate.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${datePart} • ${timePart}`;
  }, [currentCourse]);

  // Mostrar loader mientras se verifica la autenticación o si el usuario está logueado
  // Esto evita el "flash" de la página pública antes de redirigir
  // PERO: si pasa el timeout y no hay session/user, mostrar la página (evita spinner infinito)
  const isAuthenticated = !!(user || session);
  const shouldShowLoader = isAuthenticated || (authLoading && !authTimeout);
  
  if (shouldShowLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="navbar bg-white border-b-4 border-primary shadow-sm">
        <div className="flex-1">
          <a className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">MicroCert</span>
            <span className="text-sm text-neutral/60">by Marca UNACH</span>
          </a>
        </div>
        <div className="flex-none gap-2">
          <Link href="/auth/login" className="btn btn-ghost text-neutral hover:bg-primary hover:text-white">
            Iniciar Sesión
          </Link>
          <Link href="/auth/sign-up" className="btn btn-primary text-white">
            Registrarse
          </Link>
        </div>
      </div>

      {/* Hero Section con Carrusel */}
      <div className="mb-12 overflow-visible">
        <div className="relative w-full overflow-visible">
          <div className="carousel w-full overflow-visible">
            {bannerLoading && (
              <div className="w-full h-[400px] flex items-center justify-center bg-base-200">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            )}

            {!bannerLoading && totalSlides === 0 && (
              <div className="w-full h-[400px] flex flex-col items-center justify-center bg-base-200 text-center px-6">
                <h2 className="text-3xl font-bold text-base-content mb-2">
                  Próximamente
                </h2>
                <p className="text-base-content/70 max-w-xl">
                  Aún no hay cursos destacados en el banner. Vuelve más tarde para descubrir nuevas oportunidades de capacitación.
                </p>
              </div>
            )}

            {!bannerLoading && currentCourse && (
              <div className="carousel-item relative w-full block overflow-visible">
                <div className="w-full relative overflow-visible">
                  <img
                    src={currentCourse.coverImageUrl || "/images/placeholders/course-cover.jpg"}
                    alt={currentCourse.title}
                    className="w-full h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60" />

                  <div className="absolute inset-0 flex items-center">
                    <div className="container mx-auto px-8">
                      <div className="max-w-3xl">
                        <div className="badge badge-primary mb-4 text-white font-semibold">
                          {eventStartLabel || "Próximamente"}
                        </div>
                        <h3 className="text-3xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg">
                          {currentCourse.title}
                        </h3>
                        {currentCourse.description && (
                          <p className="text-base md:text-xl text-white/90 mb-6 drop-shadow-md">
                            {currentCourse.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-6">
                          {currentCourse.tags?.map((tag) => (
                            <span
                              key={tag}
                              className="badge badge-outline border-white text-white bg-white/10 backdrop-blur-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-6 md:mt-8">
                        <div className="bg-white/45 backdrop-blur rounded-2xl p-4 md:p-6 shadow-lg w-full md:w-fit max-w-full overflow-visible">
                          <div className="text-base-content/80 text-xs md:text-sm uppercase tracking-widest mb-3 md:mb-4">
                            Ponentes
                          </div>
                          {speakers.length > 0 ? (
                            <div className="avatar-group -space-x-4 md:-space-x-6 rtl:space-x-reverse flex-nowrap">
                              {speakers.map((speaker, index) => (
                                <div 
                                  key={speaker.id} 
                                  className="relative inline-block avatar-container"
                                  onMouseEnter={(e) => {
                                    console.log('🟢 Mouse enter:', speaker.name);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setTooltipPosition({ 
                                      x: rect.left + rect.width / 2, 
                                      y: rect.top 
                                    });
                                    setActiveTooltip(speaker.id);
                                  }}
                                  onMouseLeave={() => {
                                    console.log('🟡 Mouse leave:', speaker.name);
                                    setActiveTooltip(null);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('🔵 Click on avatar:', speaker.name, 'Current tooltip:', activeTooltip);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setTooltipPosition({ 
                                      x: rect.left + rect.width / 2, 
                                      y: rect.top 
                                    });
                                    const newTooltip = activeTooltip === speaker.id ? null : speaker.id;
                                    console.log('🔵 Setting tooltip to:', newTooltip);
                                    setActiveTooltip(newTooltip);
                                  }}
                                  onTouchStart={(e) => {
                                    e.stopPropagation();
                                    console.log('📱 Touch on avatar:', speaker.name);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setTooltipPosition({ 
                                      x: rect.left + rect.width / 2, 
                                      y: rect.top 
                                    });
                                    setActiveTooltip(activeTooltip === speaker.id ? null : speaker.id);
                                  }}
                                >
                                  <div className="avatar">
                                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full ring-2 md:ring-4 ring-white hover:ring-primary transition-all cursor-pointer hover:scale-110 hover:z-50 relative group">
                                      {speaker.photoURL ? (
                                        <img 
                                          src={speaker.photoURL} 
                                          alt={speaker.name}
                                          className="w-full h-full object-cover rounded-full"
                                          onError={(e) => {
                                            console.log('Error loading image for:', speaker.name, speaker.photoURL);
                                            e.currentTarget.style.display = 'none';
                                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (fallback) fallback.style.display = 'flex';
                                          }}
                                        />
                                      ) : null}
                                      <div 
                                        className="bg-primary text-white flex items-center justify-center w-full h-full text-xl font-bold rounded-full absolute inset-0"
                                        style={{ display: speaker.photoURL ? 'none' : 'flex' }}
                                      >
                                        {speaker.name?.charAt(0)?.toUpperCase() || "P"}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Tooltip personalizado */}
                                  {activeTooltip === speaker.id && (
                                    <div 
                                      style={{ 
                                        position: 'fixed',
                                        left: `${tooltipPosition.x}px`,
                                        top: `${tooltipPosition.y - 12}px`,
                                        transform: 'translate(-200px, -400px)',
                                        zIndex: 99999,
                                        pointerEvents: 'none',
                                        backgroundColor: '#1f2937',
                                        color: '#ffffff',
                                        padding: '8px 16px',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {speaker.name}
                                      {/* Flecha del tooltip */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: '100%',
                                          left: '50%',
                                          transform: 'translateX(-50%)',
                                          width: 0,
                                          height: 0,
                                          borderLeft: '6px solid transparent',
                                          borderRight: '6px solid transparent',
                                          borderTop: '6px solid #1f2937',
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-base-content/70 text-base">
                              Los ponentes se anunciarán próximamente.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {totalSlides > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="btn btn-circle bg-white/80 hover:bg-white border-none absolute left-4 top-1/2 -translate-y-1/2 text-primary"
              >
                ❮
              </button>
              <button
                onClick={nextSlide}
                className="btn btn-circle bg-white/80 hover:bg-white border-none absolute right-4 top-1/2 -translate-y-1/2 text-primary"
              >
                ❯
              </button>
            </>
          )}

          {totalSlides > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center gap-2">
              {bannerCourses.map((course, index) => (
                <button
                  key={course.id}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentSlide ? "bg-white w-10" : "bg-white/50 w-3"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Login Section */}
        <div className="max-w-md mx-auto">
          <div className="card bg-base-100 shadow-2xl">
            <div className="card-body">
              <h2 className="card-title text-2xl font-bold text-center mb-2">
                Iniciar Sesión
              </h2>
              <p className="text-center text-base-content/70 mb-6">
                Accede a tu cuenta para continuar
              </p>

              {error && (
                <div className="alert alert-error mb-4">
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Correo electrónico</span>
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    className="input input-bordered"
                    placeholder="tu@email.com"
                  />
                  {errors.email && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {errors.email.message}
                      </span>
                    </label>
                  )}
                </div>

                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text">Contraseña</span>
                  </label>
                  <input
                    type="password"
                    {...register("password")}
                    className="input input-bordered"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {errors.password.message}
                      </span>
                    </label>
                  )}
                  <label className="label">
                    <Link href="/auth/recover-password" className="label-text-alt link link-hover">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full text-white"
                  disabled={loading}
                >
                  {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </button>
              </form>

              <div className="divider">O</div>

              <div className="text-center">
                <p className="mb-4">¿Eres nuevo en la plataforma?</p>
                <Link href="/auth/sign-up" className="btn btn-outline btn-block">
                  Registrarse como Alumno
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-neutral/60">
            © 2025 MicroCert by Marca UNACH. Plataforma de microcredenciales.
          </p>
        </div>
      </div>
    </div>
  );
}
