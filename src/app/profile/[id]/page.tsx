"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/user";
import { Course } from "@/types/course";
import { Loader } from "@/components/common/Loader";
import {
  IconMail,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconWorld,
  IconBook,
  IconBriefcase,
  IconAward,
  IconCalendar,
  IconUsers,
} from "@tabler/icons-react";

export default function PublicProfilePage() {
  const params = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [upcomingCourses, setUpcomingCourses] = useState<Course[]>([]);
  const [pastCourses, setPastCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [params.id]);

  const loadProfile = async () => {
    try {
      const userId = params.id as string;

      // Cargar usuario
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        setUser({ id: userDoc.id, ...userDoc.data() } as User);

        // Si es speaker, cargar sus cursos
        if (userDoc.data().role === "speaker") {
          const coursesQuery = query(
            collection(db, "courses"),
            where("speakerIds", "array-contains", userId)
          );
          const coursesSnapshot = await getDocs(coursesQuery);
          const coursesData = coursesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Course[];

          setCourses(coursesData);

          // Separar cursos próximos y pasados
          const now = new Date();
          const upcoming = coursesData.filter((c) => {
            if (!c.startDate) return false;
            return new Date(c.startDate) > now;
          });
          const past = coursesData.filter((c) => {
            if (!c.endDate) return true;
            return new Date(c.endDate) <= now;
          });

          setUpcomingCourses(upcoming);
          setPastCourses(past);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Usuario no encontrado</h1>
          <p className="text-base-content/70">El perfil que buscas no existe</p>
        </div>
      </div>
    );
  }

  const userData = user as any;

  return (
    <div className="min-h-screen bg-base-200">
      {/* Imagen de portada */}
      <div className="relative">
        {userData.coverImageUrl ? (
          <div
            className="h-80 bg-cover bg-center"
            style={{ backgroundImage: `url(${userData.coverImageUrl})` }}
          />
        ) : (
          <div className="h-80 bg-gradient-to-r from-primary to-secondary" />
        )}
      </div>

      {/* Contenedor principal */}
      <div className="max-w-6xl mx-auto px-4 -mt-32 relative z-10">
        {/* Card de perfil */}
        <div className="card bg-base-100 shadow-2xl mb-6">
          <div className="card-body">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="avatar">
                  <div className="w-40 h-40 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} />
                    ) : (
                      <div className="bg-primary text-primary-content flex items-center justify-center text-6xl font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Información principal */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{user.name}</h1>
                {user.bio && (
                  <p className="text-lg text-base-content/70 mb-4">{user.bio}</p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="badge badge-primary badge-lg text-white">
                    {user.role === "speaker" ? "Ponente" : user.role === "admin" ? "Administrador" : "Estudiante"}
                  </div>
                  {courses.length > 0 && (
                    <div className="badge badge-secondary badge-lg text-white">
                      {courses.length} {courses.length === 1 ? "Curso" : "Cursos"}
                    </div>
                  )}
                </div>

                {/* Enlaces sociales */}
                {user.socialLinks && (
                  <div className="flex flex-wrap gap-3">
                    {user.socialLinks.linkedin && (
                      <a
                        href={user.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline gap-2"
                      >
                        <IconBrandLinkedin size={18} />
                        LinkedIn
                      </a>
                    )}
                    {user.socialLinks.twitter && (
                      <a
                        href={user.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline gap-2"
                      >
                        <IconBrandTwitter size={18} />
                        Twitter
                      </a>
                    )}
                    {user.socialLinks.website && (
                      <a
                        href={user.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline gap-2"
                      >
                        <IconWorld size={18} />
                        Sitio Web
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Grid de contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Información */}
          <div className="lg:col-span-2 space-y-6">
            {/* Acerca de */}
            {userData.aboutMe && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-2xl mb-4">Acerca de</h2>
                  <p className="whitespace-pre-wrap text-base-content/80">{userData.aboutMe}</p>
                </div>
              </div>
            )}

            {/* Servicios */}
            {userData.services && userData.services.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-2xl mb-4 flex items-center gap-2">
                    <IconBriefcase size={28} />
                    Servicios
                  </h2>
                  <ul className="space-y-2">
                    {userData.services.map((service: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{service}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Cursos próximos */}
            {upcomingCourses.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-2xl mb-4 flex items-center gap-2">
                    <IconCalendar size={28} />
                    Próximos Cursos
                  </h2>
                  <div className="space-y-4">
                    {upcomingCourses.map((course) => (
                      <div key={course.id} className="border-l-4 border-primary pl-4">
                        <h3 className="font-bold text-lg">{course.title}</h3>
                        <p className="text-sm text-base-content/70">{course.description}</p>
                        {course.startDate && (
                          <p className="text-xs text-base-content/60 mt-2">
                            Inicia: {new Date(course.startDate).toLocaleDateString("es-MX", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cursos impartidos */}
            {pastCourses.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-2xl mb-4 flex items-center gap-2">
                    <IconBook size={28} />
                    Cursos Impartidos
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pastCourses.map((course) => (
                      <a
                        key={course.id}
                        href={`/course/${course.id}`}
                        className="card bg-base-200 hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        {course.thumbnailUrl && (
                          <figure>
                            <img
                              src={course.thumbnailUrl}
                              alt={course.title}
                              className="w-full h-40 object-cover"
                            />
                          </figure>
                        )}
                        <div className="card-body p-4">
                          <h3 className="font-semibold">{course.title}</h3>
                          <p className="text-sm text-base-content/70 line-clamp-2">
                            {course.description}
                          </p>
                          <div className="card-actions justify-end mt-2">
                            <span className="text-xs text-primary font-semibold">
                              Ver detalles →
                            </span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha - Destacados */}
          <div className="space-y-6">
            {/* Libros favoritos */}
            {userData.favoriteBooks && userData.favoriteBooks.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title text-lg mb-3 flex items-center gap-2">
                    <IconBook size={22} />
                    Libros Favoritos
                  </h3>
                  <ul className="space-y-2">
                    {userData.favoriteBooks.map((book: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary">📚</span>
                        <span>{book}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Libros publicados */}
            {userData.publishedBooks && userData.publishedBooks.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title text-lg mb-3 flex items-center gap-2">
                    <IconAward size={22} />
                    Libros Publicados
                  </h3>
                  <div className="space-y-3">
                    {userData.publishedBooks.map((book: any, index: number) => (
                      <div key={index} className="border-l-2 border-primary pl-3">
                        <p className="font-semibold text-sm">{book.title}</p>
                        {book.year && (
                          <p className="text-xs text-base-content/60">{book.year}</p>
                        )}
                        {book.url && (
                          <a
                            href={book.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            Ver más →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cursos externos */}
            {userData.externalCourses && userData.externalCourses.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title text-lg mb-3">Cursos Externos</h3>
                  <div className="space-y-3">
                    {userData.externalCourses.map((course: any, index: number) => (
                      <a
                        key={index}
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                      >
                        <p className="font-semibold text-sm">{course.title}</p>
                        {course.platform && (
                          <p className="text-xs text-base-content/60">{course.platform}</p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Logros */}
            {userData.achievements && userData.achievements.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title text-lg mb-3 flex items-center gap-2">
                    <IconAward size={22} />
                    Logros
                  </h3>
                  <ul className="space-y-2">
                    {userData.achievements.map((achievement: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary">🏆</span>
                        <span>{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer espaciador */}
      <div className="h-20"></div>
    </div>
  );
}
