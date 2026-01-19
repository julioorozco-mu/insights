/**
 * MicrocredentialBadge - Insignia con estados visuales
 */

'use client';

import { IconAward, IconLock } from '@tabler/icons-react';

interface MicrocredentialBadgeProps {
    imageUrl: string;
    lockedImageUrl?: string | null;
    title: string;
    isUnlocked: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    badgeColor?: string | null;
    showLabel?: boolean;
    animate?: boolean;
}

const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
};

export function MicrocredentialBadge({
    imageUrl,
    lockedImageUrl,
    title,
    isUnlocked,
    size = 'md',
    badgeColor,
    showLabel = false,
    animate = false,
}: MicrocredentialBadgeProps) {
    const displayImage = isUnlocked
        ? imageUrl
        : (lockedImageUrl || imageUrl);

    return (
        <div className="flex flex-col items-center gap-2">
            <div
                className={`relative ${sizeClasses[size]} rounded-full p-1 shadow-lg ${animate && isUnlocked ? 'animate-pulse' : ''
                    }`}
                style={{
                    background: isUnlocked
                        ? (badgeColor
                            ? `linear-gradient(135deg, ${badgeColor}, ${badgeColor}80)`
                            : 'linear-gradient(135deg, #192170, #3C1970)')
                        : 'linear-gradient(135deg, #9ca3af, #6b7280)'
                }}
            >
                <div className={`w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center ${!isUnlocked ? 'grayscale opacity-60' : ''
                    }`}>
                    {displayImage ? (
                        <img
                            src={displayImage}
                            alt={title}
                            className="w-full h-full object-contain p-2"
                        />
                    ) : (
                        <IconAward
                            className={`${size === 'sm' ? 'w-8 h-8' :
                                    size === 'md' ? 'w-12 h-12' :
                                        size === 'lg' ? 'w-16 h-16' :
                                            'w-24 h-24'
                                } ${isUnlocked ? 'text-primary' : 'text-gray-400'}`}
                        />
                    )}
                </div>

                {/* Overlay de candado si está bloqueado */}
                {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                        <div className="bg-gray-800 p-2 rounded-full">
                            <IconLock className="w-4 h-4 text-white" />
                        </div>
                    </div>
                )}

                {/* Efecto de brillo si está desbloqueado */}
                {isUnlocked && (
                    <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                        <div
                            className="absolute inset-0 opacity-20"
                            style={{
                                background: 'linear-gradient(135deg, transparent 30%, white 50%, transparent 70%)',
                            }}
                        />
                    </div>
                )}
            </div>

            {showLabel && (
                <div className="text-center">
                    <p className={`font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'} line-clamp-2`}>
                        {title}
                    </p>
                    <p className={`text-xs ${isUnlocked ? 'text-success' : 'text-base-content/50'}`}>
                        {isUnlocked ? '✓ Obtenida' : 'En progreso'}
                    </p>
                </div>
            )}
        </div>
    );
}
