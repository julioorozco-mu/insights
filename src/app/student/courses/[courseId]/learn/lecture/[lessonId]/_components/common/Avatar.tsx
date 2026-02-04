'use client';

import { memo } from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

/**
 * Componente Avatar con fallback a iniciales
 */
export const Avatar = memo(function Avatar({
  src,
  name,
  size = 'md',
  className = '',
}: AvatarProps) {
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <div className={`avatar ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full`}>
          <img
            src={src}
            alt={name}
            loading="lazy"
            onError={(e) => {
              // Fallback a iniciales si la imagen falla
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('placeholder', 'bg-primary', 'text-primary-content');
              e.currentTarget.parentElement!.innerHTML = `<span>${initials}</span>`;
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`avatar placeholder ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full bg-primary text-primary-content`}>
        <span>{initials}</span>
      </div>
    </div>
  );
});
