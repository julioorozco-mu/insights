"use client";

import { useEffect, useState, useCallback, memo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/common/Loader";
import {
  Heart,
  HeartOff,
  BookOpen,
  Star,
  Clock,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { IconLoader2 } from "@tabler/icons-react";

// Función para extraer texto plano de HTML (para previews)
function stripHtml(html: string): string {
  if (!html) return "";
  let text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

interface FavoriteCourse {
  id: string;
  course_id: string;
  created_at: string;
  courses: {
    id: string;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    thumbnail_url: string | null;
    tags: string[];
    difficulty: string | null;
    average_rating: number | null;
    reviews_count: number | null;
    price: number | null;
    sale_percentage: number | null;
    teachers: { id: string; name: string; avatarUrl?: string }[];
  } | null;
}

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;

      try {
        const response = await fetch(`/api/student/favorites?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setFavorites(data.favorites || []);
        }
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  // useCallback para evitar re-renders innecesarios (rerender-memo)
  const handleRemoveFavorite = useCallback(async (courseId: string) => {
    if (!user || removingId) return;

    setRemovingId(courseId);
    try {
      const response = await fetch(
        `/api/student/favorites?courseId=${courseId}&userId=${user.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setFavorites(prev => prev.filter(f => f.course_id !== courseId));
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    } finally {
      setRemovingId(null);
    }
  }, [user, removingId]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Mis Favoritos</h1>
        <p className="text-base-content/70">
          Microcredenciales guardadas para ver más tarde
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center py-16">
            <div className="w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mb-6">
              <HeartOff className="w-12 h-12 text-error/60" />
            </div>

            <h2 className="text-2xl font-bold mb-2">No tienes favoritos aún</h2>
            <p className="text-base-content/70 max-w-md mb-8">
              Explora las microcredenciales disponibles y marca las que te interesen
              como favoritas para acceder a ellas fácilmente.
            </p>

            <Link href="/dashboard/available-courses" className="btn btn-primary gap-2">
              <BookOpen className="w-5 h-5" />
              Explorar Microcredenciales
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats shadow mb-8 w-full">
            <div className="stat">
              <div className="stat-figure text-error">
                <Heart className="w-8 h-8 fill-current" />
              </div>
              <div className="stat-title">Total Favoritos</div>
              <div className="stat-value text-error">{favorites.length}</div>
              <div className="stat-desc">Microcredenciales guardadas</div>
            </div>
          </div>

          {/* Favorites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => {
              const course = favorite.courses;
              if (!course) return null;

              const hasDiscount = course.sale_percentage && course.sale_percentage > 0;
              const originalPrice = course.price || 0;
              const discountedPrice = hasDiscount
                ? originalPrice * (1 - (course.sale_percentage || 0) / 100)
                : originalPrice;

              return (
                <div
                  key={favorite.id}
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 group"
                >
                  {/* Image */}
                  <figure className="aspect-video bg-base-300 relative overflow-hidden">
                    {course.cover_image_url || course.thumbnail_url ? (
                      <img
                        src={course.cover_image_url || course.thumbnail_url || ''}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-500 to-indigo-600">
                        <BookOpen className="w-16 h-16 text-white/50" />
                      </div>
                    )}

                    {/* Favorite badge */}
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveFavorite(course.id);
                        }}
                        disabled={removingId === course.id}
                        className="btn btn-circle btn-sm bg-white/90 hover:bg-red-500 hover:text-white border-0 shadow-lg transition-all"
                        title="Quitar de favoritos"
                      >
                        {removingId === course.id ? (
                          <IconLoader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        )}
                      </button>
                    </div>

                    {/* Discount badge */}
                    {hasDiscount && (
                      <div className="absolute top-3 left-3 badge badge-error text-white font-bold">
                        -{course.sale_percentage}%
                      </div>
                    )}
                  </figure>

                  <div className="card-body">
                    {/* Tags */}
                    {course.tags && course.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {course.tags.slice(0, 2).map((tag, idx) => (
                          <span key={idx} className="badge badge-ghost badge-sm">
                            {tag}
                          </span>
                        ))}
                        {course.tags.length > 2 && (
                          <span className="badge badge-ghost badge-sm">
                            +{course.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="card-title text-lg line-clamp-2">
                      {course.title}
                    </h2>

                    {/* Description */}
                    {course.description && (
                      <p className="text-sm text-base-content/70 line-clamp-2">
                        {stripHtml(course.description)}
                      </p>
                    )}

                    {/* Teachers */}
                    {course.teachers && course.teachers.length > 0 && (
                      <p className="text-sm text-base-content/60">
                        Por {course.teachers.map(t => t.name).join(", ")}
                      </p>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-2 mt-2">
                      {course.average_rating && course.average_rating > 0 ? (
                        <>
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-bold">{course.average_rating.toFixed(1)}</span>
                          </div>
                          <span className="text-sm text-base-content/50">
                            ({course.reviews_count} {course.reviews_count === 1 ? 'reseña' : 'reseñas'})
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-base-content/50">Sin calificaciones</span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2 mt-2">
                      {originalPrice > 0 ? (
                        <>
                          <span className="text-lg font-bold text-primary">
                            ${discountedPrice.toFixed(0)} MXN
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-base-content/50 line-through">
                              ${originalPrice.toFixed(0)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-lg font-bold text-success">Gratis</span>
                      )}
                    </div>

                    {/* Added date */}
                    <div className="flex items-center gap-1 text-xs text-base-content/50 mt-2">
                      <Clock className="w-3 h-3" />
                      <span>
                        Añadido el {new Date(favorite.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="card-actions justify-between items-center mt-4 pt-4 border-t border-base-200">
                      <button
                        onClick={() => handleRemoveFavorite(course.id)}
                        disabled={removingId === course.id}
                        className="btn btn-ghost btn-sm text-error gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Quitar
                      </button>
                      <Link
                        href={`/dashboard/student/courses/${course.id}`}
                        className="btn btn-primary btn-sm text-white gap-1"
                      >
                        Ver curso
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
