/**
 * CourseCard - Componente memoizado para tarjetas de curso
 * Optimizado para evitar re-renders innecesarios (rerender-memo)
 */

import React, { memo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IconBook, IconHeart, IconHeartFilled, IconUser } from '@tabler/icons-react';
import { StarRating, StarRatingCompact } from './StarRating';
import { stripHtmlAndTruncate } from '@/lib/utils';

// Imagen placeholder por defecto
const DEFAULT_COVER_IMAGE = '/placeholder-course.svg';

interface Speaker {
    id: string;
    name: string;
    lastName?: string;
    avatarUrl?: string;
}

interface CourseCardProps {
    id: string;
    title: string;
    description?: string | null;
    coverImageUrl?: string | null;
    speaker?: Speaker | null;
    lessonCount?: number;
    averageRating?: number;
    reviewsCount?: number;
    isFavorite?: boolean;
    isEnrolled?: boolean;
    progress?: number;
    showProgress?: boolean;
    onToggleFavorite?: (courseId: string, e: React.MouseEvent) => void;
    onCardClick?: (courseId: string) => void;
    href?: string;
    loadingFavorite?: boolean;
    className?: string;
    variant?: 'default' | 'enrolled' | 'completed';
}

/**
 * Tarjeta de curso memoizada - evita re-renders cuando las props no cambian
 */
export const CourseCard = memo(({
    id,
    title,
    description,
    coverImageUrl,
    speaker,
    lessonCount = 0,
    averageRating = 0,
    reviewsCount = 0,
    isFavorite = false,
    isEnrolled = false,
    progress = 0,
    showProgress = false,
    onToggleFavorite,
    onCardClick,
    href,
    loadingFavorite = false,
    className = '',
    variant = 'default'
}: CourseCardProps) => {

    const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleFavorite?.(id, e);
    }, [id, onToggleFavorite]);

    const handleCardClick = useCallback(() => {
        onCardClick?.(id);
    }, [id, onCardClick]);

    const CardContent = () => (
        <div
            className={`group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100/60 cursor-pointer flex flex-col h-full ${className}`}
            onClick={handleCardClick}
        >
            {/* Cover Image */}
            <div className="relative aspect-video w-full overflow-hidden">
                <Image
                    src={coverImageUrl || DEFAULT_COVER_IMAGE}
                    alt={title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />

                {/* Favorite Button */}
                {onToggleFavorite && (
                    <button
                        onClick={handleFavoriteClick}
                        disabled={loadingFavorite}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center transition-all z-10"
                        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                        {isFavorite ? (
                            <IconHeartFilled size={20} className="text-red-500" />
                        ) : (
                            <IconHeart size={20} className="text-gray-400 hover:text-red-400" />
                        )}
                    </button>
                )}

                {/* Progress Bar (for enrolled courses) */}
                {showProgress && progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200/80">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                )}

                {/* Enrolled Badge */}
                {isEnrolled && !showProgress && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-md">
                        Inscrito
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow">
                {/* Title */}
                <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-700 transition-colors">
                    {title}
                </h3>

                {/* Description */}
                {description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-grow">
                        {stripHtmlAndTruncate(description, 120)}
                    </p>
                )}

                {/* Speaker */}
                {speaker && (
                    <div className="flex items-center gap-2 mb-2">
                        {speaker.avatarUrl ? (
                            <Image
                                src={speaker.avatarUrl}
                                alt={speaker.name}
                                width={24}
                                height={24}
                                className="rounded-full"
                            />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                <IconUser size={14} className="text-gray-500" />
                            </div>
                        )}
                        <span className="text-sm text-gray-600 truncate">{speaker.name}</span>
                    </div>
                )}

                {/* Meta info */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                    {/* Lesson count */}
                    <div className="flex items-center gap-1.5 text-gray-500">
                        <IconBook size={16} />
                        <span className="text-sm">{lessonCount} {lessonCount === 1 ? 'lección' : 'lecciones'}</span>
                    </div>

                    {/* Rating */}
                    {averageRating > 0 && (
                        <StarRatingCompact rating={averageRating} reviewsCount={reviewsCount} size={14} />
                    )}
                </div>

                {/* Progress text (for enrolled) */}
                {showProgress && (
                    <div className="mt-2 text-sm text-gray-500">
                        {progress >= 100 ? (
                            <span className="text-green-600 font-medium">✓ Completado</span>
                        ) : (
                            <span>{progress.toFixed(0)}% completado</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // Si hay href, envolver en Link
    if (href) {
        return (
            <Link href={href} className="block h-full">
                <CardContent />
            </Link>
        );
    }

    return <CardContent />;
});

CourseCard.displayName = 'CourseCard';

export default CourseCard;
