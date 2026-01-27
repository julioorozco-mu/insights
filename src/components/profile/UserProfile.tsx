"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { userRepository } from "@/lib/repositories/userRepository";
import { teacherRepository, TeacherData } from "@/lib/repositories/teacherRepository";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { User } from "@/types/user";
import { Course } from "@/types/course";
import { capitalizeText } from "@/lib/utils";
import {
  Mail,
  Linkedin,
  Twitter,
  Globe,
  BookOpen,
  Briefcase,
  Award,
  Calendar,
  Users,
  MapPin,
  ArrowLeft,
  Shield,
  GraduationCap,
  Clock,
  LayoutGrid,
  CheckCircle2
} from "lucide-react";

interface UserProfileProps {
  userId: string;
  isPublic?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  student: "Estudiante",
  teacher: "Instructor",
  admin: "Administrador",
  support: "Soporte",
  superadmin: "Super Administrador",
};

export function UserProfile({ userId, isPublic = false }: UserProfileProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [upcomingCourses, setUpcomingCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!userId || hasLoaded) return;
    
    try {
      setLoading(true);
      const fetchedUser = await userRepository.findById(userId);
      if (fetchedUser) {
        setUser(fetchedUser as User);
        const teacherProfile = await teacherRepository.findByUserId(userId);
        if (teacherProfile) setTeacherData(teacherProfile);

        if (["teacher", "admin", "superadmin"].includes(fetchedUser.role)) {
          const coursesData = await courseRepository.findBySpeaker(userId);
          setCourses(coursesData);
          const now = new Date();
          setUpcomingCourses(coursesData.filter(c => c.startDate && new Date(c.startDate) > now));
        }
      }
      setHasLoaded(true);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, hasLoaded]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <span className="loading loading-spinner loading-lg text-[#192170]"></span>
        <p className="text-slate-500 font-medium">Cargando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md text-center w-full">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Usuario no encontrado</h1>
          <p className="text-slate-500 mb-6">El perfil que buscas no existe o ha sido eliminado.</p>
          {isPublic && (
            <button onClick={() => router.back()} className="btn btn-primary w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          )}
        </div>
      </div>
    );
  }

  const profileData = {
    coverImageUrl: teacherData?.coverImageUrl,
    aboutMe: teacherData?.aboutMe || user.bio,
    services: teacherData?.services || [],
    favoriteBooks: teacherData?.favoriteBooks || [],
    publishedBooks: teacherData?.publishedBooks || [],
    externalCourses: teacherData?.externalCourses || [],
    achievements: teacherData?.achievements || [],
    expertise: teacherData?.expertise || [],
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No disponible";
    return new Date(dateString).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className={`space-y-6 ${isPublic ? 'bg-slate-50 min-h-screen pb-12' : ''}`}>
      {/* Botón volver flotante si es público */}
      {isPublic && (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 mb-6">
          <div className="max-w-7xl mx-auto">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-600 hover:text-[#192170] transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver al listado</span>
            </button>
          </div>
        </div>
      )}

      <div className={isPublic ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" : ""}>
        {/* Cabecera del Perfil */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Portada */}
          <div className="h-48 md:h-64 bg-slate-100 relative">
            {profileData.coverImageUrl ? (
              <img 
                src={profileData.coverImageUrl} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-[#192170] to-[#3C1970]" />
            )}
          </div>

          {/* Info Principal */}
          <div className="px-6 pb-6 md:px-8 md:pb-8 relative">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar - Posicionado sobre la línea */}
              <div className="-mt-16 md:-mt-20 flex-shrink-0 relative z-10">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-white p-1 shadow-lg">
                  <div className="w-full h-full rounded-xl overflow-hidden bg-slate-100 relative">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#192170] text-white flex items-center justify-center text-5xl font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Datos de Texto */}
              <div className="flex-1 pt-2 md:pt-4 w-full">
                <div className="flex flex-col md:flex-row md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                      {user.name} {user.lastName}
                    </h1>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                        <Shield className="w-3.5 h-3.5" />
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                      {user.state && (
                        <span className="inline-flex items-center gap-1.5 text-slate-500 text-sm">
                          <MapPin className="w-4 h-4" />
                          {user.state}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-slate-500 text-sm">
                        <Clock className="w-4 h-4" />
                        Miembro desde {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Redes Sociales */}
                  {user.socialLinks && (
                    <div className="flex gap-2">
                      {user.socialLinks.linkedin && (
                        <a href={user.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" 
                           className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-[#0077b5] hover:text-white transition-all border border-slate-200">
                          <Linkedin className="w-5 h-5" />
                        </a>
                      )}
                      {user.socialLinks.twitter && (
                        <a href={user.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                           className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-[#1DA1F2] hover:text-white transition-all border border-slate-200">
                          <Twitter className="w-5 h-5" />
                        </a>
                      )}
                      {user.socialLinks.website && (
                        <a href={user.socialLinks.website} target="_blank" rel="noopener noreferrer"
                           className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-emerald-500 hover:text-white transition-all border border-slate-200">
                          <Globe className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Columna Principal (Izquierda) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Acerca de */}
            {profileData.aboutMe && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#192170]" />
                  Acerca de mí
                </h2>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                  {profileData.aboutMe}
                </p>
              </div>
            )}

            {/* Expertise & Servicios */}
            {(profileData.expertise.length > 0 || profileData.services.length > 0) && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#192170]" />
                  Experiencia y Servicios
                </h2>
                
                {profileData.expertise.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Áreas de Expertise</h3>
                    <div className="flex flex-wrap gap-2">
                      {profileData.expertise.map((item, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-50 text-slate-700 rounded-full text-sm border border-slate-200 font-medium">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profileData.services.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Servicios Profesionales</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {profileData.services.map((service, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <CheckCircle2 className="w-5 h-5 text-[#3C1970]" />
                          <span className="text-sm text-slate-700 font-medium">{service}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cursos */}
            {courses.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#192170]" />
                    Cursos Impartidos ({courses.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {courses.map((course) => (
                    <a
                      key={course.id}
                      href={`/course/${course.id}`}
                      className="group flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-200 hover:border-[#192170] hover:shadow-md transition-all bg-white"
                    >
                      <div className="w-full sm:w-48 h-32 sm:h-28 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        {course.thumbnailUrl ? (
                          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#192170]/5 text-[#192170]">
                            <BookOpen className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-[#192170] transition-colors mb-1">
                          {capitalizeText(course.title)}
                        </h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                          {capitalizeText(course.description)}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            Instructor
                          </span>
                          {course.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(course.startDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar (Derecha) */}
          <div className="space-y-6">
            
            {/* Info Adicional */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Detalles</h3>
              <ul className="space-y-4">
                {user.email && (
                  <li className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-slate-500" />
                    </div>
                    <span className="break-all">{user.email}</span>
                  </li>
                )}
                {user.phone && (
                  <li className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-slate-500" />
                    </div>
                    <span>{user.phone}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Estadísticas */}
            {(courses.length > 0 || upcomingCourses.length > 0) && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Estadísticas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#192170]/5 border border-[#192170]/10 text-center">
                    <div className="text-2xl font-bold text-[#192170]">{courses.length}</div>
                    <div className="text-xs font-medium text-slate-600 mt-1">Cursos</div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                    <div className="text-2xl font-bold text-emerald-700">{upcomingCourses.length}</div>
                    <div className="text-xs font-medium text-slate-600 mt-1">Activos</div>
                  </div>
                </div>
              </div>
            )}

            {/* Logros */}
            {profileData.achievements.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4" /> Logros
                </h3>
                <div className="space-y-3">
                  {profileData.achievements.map((achievement, i) => (
                    <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <span className="text-lg">🏆</span>
                      <span className="text-sm text-slate-700 font-medium">{achievement}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Publicaciones / Libros */}
            {(profileData.publishedBooks.length > 0 || profileData.favoriteBooks.length > 0) && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Biblioteca
                </h3>
                
                {profileData.publishedBooks.length > 0 && (
                  <div className="mb-6">
                    <span className="text-xs font-semibold text-slate-500 mb-2 block">Publicaciones</span>
                    <div className="space-y-3">
                      {profileData.publishedBooks.map((book: any, i: number) => (
                        <a key={i} href={book.url || "#"} target="_blank" className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                          <p className="text-sm font-medium text-slate-900">{book.title}</p>
                          {book.year && <p className="text-xs text-slate-500 mt-1">{book.year}</p>}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {profileData.favoriteBooks.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 mb-2 block">Favoritos</span>
                    <ul className="space-y-2">
                      {profileData.favoriteBooks.map((book, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          {book}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
