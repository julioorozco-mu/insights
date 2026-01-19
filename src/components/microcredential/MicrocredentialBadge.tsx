/**
 * MicrocredentialBadge - Insignia con estados visuales
 */

'use client';

import { IconAward, IconLock } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

interface MicrocredentialBadgeProps {
    imageUrl: string;
    lockedImageUrl?: string | null;
    title: string;
    isUnlocked: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    badgeColor?: string | null;
    showLabel?: boolean;
    animate?: boolean;
    progressPercentage?: number; // 0-100
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
    progressPercentage = 0,
}: MicrocredentialBadgeProps) {
    const displayImage = isUnlocked
        ? imageUrl
        : (lockedImageUrl || imageUrl);

    // Normalizar el progreso
    const progress = Math.min(Math.max(progressPercentage, 0), 100);

    // Estado para animación inicial del progreso
    const [animatedProgress, setAnimatedProgress] = useState(0);
    const [animatedRingProgress, setAnimatedRingProgress] = useState(0);

    // Animar el progreso al cargar
    useEffect(() => {
        // Pequeño delay para que se note la animación
        const timer = setTimeout(() => {
            setAnimatedProgress(progress);
            setAnimatedRingProgress(progress);
        }, 100);
        return () => clearTimeout(timer);
    }, [progress]);

    // Calcular valores para el anillo de progreso
    const sizeMap = { sm: 64, md: 96, lg: 128, xl: 192 };
    const svgSize = sizeMap[size];
    const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : size === 'lg' ? 5 : 6;
    const radius = (svgSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedRingProgress / 100) * circumference;

    // ID único para el clip path (para evitar conflictos con múltiples badges)
    const clipPathId = `wave-clip-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className="flex flex-col items-center gap-2">
            <div
                className={`relative ${sizeClasses[size]} rounded-full p-0.5 shadow-lg ${animate && isUnlocked ? 'animate-pulse' : ''
                    }`}
                style={{
                    background: isUnlocked
                        ? (badgeColor
                            ? `linear-gradient(135deg, ${badgeColor}, ${badgeColor}80)`
                            : 'linear-gradient(135deg, #192170, #3C1970)')
                        : 'linear-gradient(135deg, #9ca3af, #6b7280)'
                }}
            >
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative bg-gray-100">
                    {displayImage ? (
                        <svg
                            className="w-full h-full"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                        >
                            <defs>
                                <clipPath id={clipPathId} clipPathUnits="objectBoundingBox">
                                    <path>
                                        <animate
                                            attributeName="d"
                                            dur="3s"
                                            repeatCount="indefinite"
                                            calcMode="spline"
                                            keyTimes="0;0.5;1"
                                            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
                                            values={`
                                                M 0,0 L 1,0 L 1,${animatedProgress / 100} C 0.8,${(animatedProgress / 100) - 0.04} 0.6,${(animatedProgress / 100) + 0.04} 0.5,${animatedProgress / 100} S 0.2,${(animatedProgress / 100) - 0.04} 0,${animatedProgress / 100} Z;
                                                M 0,0 L 1,0 L 1,${animatedProgress / 100} C 0.8,${(animatedProgress / 100) + 0.04} 0.6,${(animatedProgress / 100) - 0.04} 0.5,${animatedProgress / 100} S 0.2,${(animatedProgress / 100) + 0.04} 0,${animatedProgress / 100} Z;
                                                M 0,0 L 1,0 L 1,${animatedProgress / 100} C 0.8,${(animatedProgress / 100) - 0.04} 0.6,${(animatedProgress / 100) + 0.04} 0.5,${animatedProgress / 100} S 0.2,${(animatedProgress / 100) - 0.04} 0,${animatedProgress / 100} Z
                                            `}
                                        />
                                    </path>
                                </clipPath>
                            </defs>

                            {/* Fondo: Imagen escala de grises */}
                            <image
                                href={displayImage}
                                x="0" y="0" width="100" height="100"
                                preserveAspectRatio="xMidYMid meet"
                                style={{
                                    filter: !isUnlocked ? 'grayscale(100%) opacity(0.6)' : 'grayscale(100%) opacity(0.4)',
                                    transform: 'scale(1.7)',
                                    transformOrigin: 'center'
                                }}
                            />

                            {/* Frente: Imagen color revelada con la onda */}
                            {(animatedProgress > 0 && !isUnlocked) && (
                                <image
                                    href={imageUrl}
                                    x="0" y="0" width="100" height="100"
                                    preserveAspectRatio="xMidYMid meet"
                                    clipPath={`url(#${clipPathId})`}
                                    style={{
                                        transform: 'scale(1.15)',
                                        transformOrigin: 'center',
                                        transition: 'opacity 0.5s ease'
                                    }}
                                />
                            )}

                            {/* Completado: Imagen full color */}
                            {isUnlocked && (
                                <image
                                    href={imageUrl}
                                    x="0" y="0" width="100" height="100"
                                    preserveAspectRatio="xMidYMid meet"
                                    style={{
                                        transform: 'scale(1.15)',
                                        transformOrigin: 'center'
                                    }}
                                />
                            )}
                        </svg>
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

                {/* Overlay de candado si está bloqueado y sin progreso */}
                {!isUnlocked && progress === 0 && (
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

                {/* Anillo de progreso circular - Solo visible si hay progreso y no está 100% completado */}
                {progress > 0 && progress < 100 && !isUnlocked && (
                    <svg
                        className="absolute -inset-1 transform -rotate-90"
                        width={svgSize + 8}
                        height={svgSize + 8}
                        style={{ pointerEvents: 'none' }}
                    >
                        {/* Círculo de fondo (gris claro) */}
                        <circle
                            cx={(svgSize + 8) / 2}
                            cy={(svgSize + 8) / 2}
                            r={radius}
                            stroke="#e5e7eb"
                            strokeWidth={strokeWidth}
                            fill="none"
                            opacity={0.3}
                        />
                        {/* Círculo de progreso (degradado animado) */}
                        <circle
                            cx={(svgSize + 8) / 2}
                            cy={(svgSize + 8) / 2}
                            r={radius}
                            stroke="url(#progressGradient)"
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                        {/* Degradado para el anillo de progreso */}
                        <defs>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                        </defs>
                    </svg>
                )}
            </div>

            {showLabel && (
                <div className="text-center">
                    <p className={`font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'} line-clamp-2`}>
                        {title}
                    </p>
                    <p className={`text-xs ${isUnlocked ? 'text-success' : 'text-base-content/50'}`}>
                        {isUnlocked
                            ? '✓ Obtenida'
                            : progress > 0
                                ? `${Math.round(progress)}% completado`
                                : 'En progreso'
                        }
                    </p>
                </div>
            )}
        </div>
    );
}
