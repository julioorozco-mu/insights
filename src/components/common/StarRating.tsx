/**
 * StarRating - Componente memoizado para renderizar estrellas de rating
 * Optimizado para evitar re-renders innecesarios (rerender-memo)
 */

import React, { memo, useMemo } from 'react';
import { IconStar, IconStarFilled } from '@tabler/icons-react';

interface StarRatingProps {
    rating: number;
    reviewsCount?: number;
    size?: number;
    showCount?: boolean;
    className?: string;
}

/**
 * Renderiza un rating con estrellas llenas, medias y vacías
 * Memoizado para evitar re-renders cuando las props no cambian
 */
export const StarRating = memo(({
    rating,
    reviewsCount = 0,
    size = 16,
    showCount = true,
    className = ''
}: StarRatingProps) => {
    const stars = useMemo(() => {
        const result = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                result.push(
                    <IconStarFilled key={i} size={size} className="text-yellow-500" />
                );
            } else if (i === fullStars && hasHalfStar) {
                result.push(
                    <div key={i} className="relative">
                        <IconStar size={size} className="text-yellow-500" />
                        <div className="absolute inset-0 overflow-hidden w-1/2">
                            <IconStarFilled size={size} className="text-yellow-500" />
                        </div>
                    </div>
                );
            } else {
                result.push(
                    <IconStar key={i} size={size} className="text-yellow-500" />
                );
            }
        }
        return result;
    }, [rating, size]);

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="flex items-center gap-0.5">{stars}</div>
            <span className="text-sm font-medium">
                {rating > 0 ? rating.toFixed(1) : '—'}
            </span>
            {showCount && (
                <span className="text-xs text-base-content/60">
                    ({reviewsCount} {reviewsCount === 1 ? 'reseña' : 'reseñas'})
                </span>
            )}
        </div>
    );
});

StarRating.displayName = 'StarRating';

/**
 * Versión compacta del StarRating - solo muestra una estrella con el número
 */
export const StarRatingCompact = memo(({
    rating,
    reviewsCount = 0,
    size = 14,
    className = ''
}: Omit<StarRatingProps, 'showCount'>) => {
    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            <IconStarFilled size={size} className="text-yellow-500" />
            <span className="text-sm font-semibold text-slate-900">
                {rating > 0 ? rating.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-slate-500">
                ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
            </span>
        </div>
    );
});

StarRatingCompact.displayName = 'StarRatingCompact';

export default StarRating;
