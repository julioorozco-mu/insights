/**
 * MicrocredentialBadge - Insignia con estados visuales
 */

'use client';

import { IconAward, IconLock } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
    const [revealPhase, setRevealPhase] = useState<'fill' | 'wave'>('wave');
    const animatedProgressRef = useRef(0);
    const fillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fillRafRef = useRef<number | null>(null);

    // Animación: "llenado" suave de arriba hacia abajo (tipo agua al revés).
    // Al final se queda solo la onda en el borde.
    useEffect(() => {
        if (fillTimerRef.current) {
            clearTimeout(fillTimerRef.current);
            fillTimerRef.current = null;
        }
        if (fillRafRef.current != null) {
            cancelAnimationFrame(fillRafRef.current);
            fillRafRef.current = null;
        }

        if (isUnlocked) {
            setRevealPhase('wave');
            setAnimatedProgress(100);
            setAnimatedRingProgress(100);
            animatedProgressRef.current = 100;
            return;
        }

        if (progress <= 0) {
            setRevealPhase('wave');
            setAnimatedProgress(0);
            setAnimatedRingProgress(0);
            animatedProgressRef.current = 0;
            return;
        }

        const from = animatedProgressRef.current;
        const to = progress;

        if (from === to) {
            setRevealPhase('wave');
            return;
        }

        const delayMs = 100;
        const delta = Math.abs(to - from);
        const durationMs = Math.min(2400, Math.max(900, Math.round(700 + delta * 12)));

        setRevealPhase('fill');
        fillTimerRef.current = setTimeout(() => {
            const start = performance.now();
            const tick = (now: number) => {
                const t = Math.min(1, (now - start) / durationMs);
                const eased = 0.5 - 0.5 * Math.cos(Math.PI * t); // easeInOutSine
                const next = from + (to - from) * eased;

                animatedProgressRef.current = next;
                setAnimatedProgress(next);
                setAnimatedRingProgress(next);

                if (t < 1) {
                    fillRafRef.current = requestAnimationFrame(tick);
                } else {
                    setRevealPhase('wave');
                    animatedProgressRef.current = to;
                    setAnimatedProgress(to);
                    setAnimatedRingProgress(to);
                    fillRafRef.current = null;
                }
            };

            fillRafRef.current = requestAnimationFrame(tick);
        }, delayMs);

        return () => {
            if (fillTimerRef.current) {
                clearTimeout(fillTimerRef.current);
                fillTimerRef.current = null;
            }
            if (fillRafRef.current != null) {
                cancelAnimationFrame(fillRafRef.current);
                fillRafRef.current = null;
            }
        };
    }, [progress, isUnlocked]);

    // Calcular valores para el anillo de progreso
    const sizeMap = { sm: 64, md: 96, lg: 128, xl: 192 };
    const svgSize = sizeMap[size];
    const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : size === 'lg' ? 5 : 6;
    const radius = (svgSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedRingProgress / 100) * circumference;

    // IDs estables (evita reset/flicker y colisiones entre múltiples badges)
    const uid = useMemo(() => Math.random().toString(36).slice(2, 11), []);
    const fillClipPathId = `fill-clip-${uid}`;
    const waveClipPathId = `wave-clip-${uid}`;
    const progressGradientId = `progress-gradient-${uid}`;

    // Onda: evitar que el oleaje "sub-revele" por debajo del % real (p.ej. 50%)
    const fillRatio = animatedProgress / 100; // 0..1
    const targetRatio = progress / 100; // 0..1
    const fillPath = `M 0,0 L 1,0 L 1,${fillRatio} L 0,${fillRatio} Z`;
    const maxWaveAmplitude = 0.04; // 4% del alto
    const waveAmplitude =
        maxWaveAmplitude * Math.min(1, targetRatio * 4, (1 - targetRatio) * 4);
    const wave1 = Math.min(targetRatio + waveAmplitude, 1);
    const wave2 = Math.min(targetRatio + waveAmplitude * 2, 1);
    const wavePathA = `M 0,0 L 1,0 L 1,${targetRatio} C 0.8,${wave2} 0.6,${wave1} 0.5,${targetRatio} S 0.2,${wave2} 0,${targetRatio} Z`;
    const wavePathB = `M 0,0 L 1,0 L 1,${targetRatio} C 0.8,${wave1} 0.6,${wave2} 0.5,${targetRatio} S 0.2,${wave1} 0,${targetRatio} Z`;

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
                                <clipPath id={fillClipPathId} clipPathUnits="objectBoundingBox">
                                    <path d={fillPath} />
                                </clipPath>
                                <clipPath id={waveClipPathId} clipPathUnits="objectBoundingBox">
                                    <path d={wavePathA}>
                                        <animate
                                            attributeName="d"
                                            dur="3s"
                                            repeatCount="indefinite"
                                            calcMode="spline"
                                            keyTimes="0;0.5;1"
                                            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
                                            values={`${wavePathA};${wavePathB};${wavePathA}`}
                                        />
                                    </path>
                                </clipPath>
                            </defs>

                            {/* Fondo: Imagen escala de grises */}
                            <image
                                href={displayImage}
                                x="0" y="0" width="100" height="100"
                                preserveAspectRatio="xMidYMid slice"
                                style={{
                                    filter: !isUnlocked ? 'grayscale(100%) opacity(0.6)' : 'grayscale(100%) opacity(0.4)',
                                }}
                            />

                            {/* Frente: Imagen color revelada con la onda */}
                            {(animatedProgress > 0 && !isUnlocked) && (
                                <>
                                    <image
                                        href={imageUrl}
                                        x="0"
                                        y="0"
                                        width="100"
                                        height="100"
                                        preserveAspectRatio="xMidYMid slice"
                                        clipPath={`url(#${fillClipPathId})`}
                                        style={{
                                            opacity: revealPhase === 'fill' ? 1 : 0,
                                            transition: 'opacity 450ms ease-in-out',
                                        }}
                                    />
                                    <image
                                        href={imageUrl}
                                        x="0"
                                        y="0"
                                        width="100"
                                        height="100"
                                        preserveAspectRatio="xMidYMid slice"
                                        clipPath={`url(#${waveClipPathId})`}
                                        style={{
                                            opacity: revealPhase === 'wave' ? 1 : 0,
                                            transition: 'opacity 450ms ease-in-out',
                                        }}
                                    />
                                </>
                            )}

                            {/* Completado: Imagen full color */}
                            {isUnlocked && (
                                <image
                                    href={imageUrl}
                                    x="0" y="0" width="100" height="100"
                                    preserveAspectRatio="xMidYMid slice"
                                    style={{
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

                {/* Anillo de progreso segmentado/punteado - Solo visible si hay progreso */}
                {progress > 0 && !isUnlocked && (
                    <svg
                        className="absolute -inset-2"
                        width={svgSize + 16}
                        height={svgSize + 16}
                        style={{ pointerEvents: 'none' }}
                    >
                        <defs>
                            <linearGradient id={progressGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#192170" />
                                <stop offset="50%" stopColor="#C9A227" />
                                <stop offset="100%" stopColor="#192170" />
                            </linearGradient>
                        </defs>
                        {/* Segmentos del anillo */}
                        {Array.from({ length: 24 }).map((_, i) => {
                            const segmentAngle = 360 / 24;
                            const startAngle = i * segmentAngle - 90; // Empezar desde arriba
                            const gapAngle = 4; // Espacio entre segmentos
                            const segmentProgress = (animatedRingProgress / 100) * 24;
                            const isFilled = i < segmentProgress;
                            const isPartial = i >= Math.floor(segmentProgress) && i < Math.ceil(segmentProgress);

                            const centerX = (svgSize + 16) / 2;
                            const centerY = (svgSize + 16) / 2;
                            const outerRadius = (svgSize + 12) / 2;
                            const innerRadius = outerRadius - (strokeWidth + 2);

                            const startRad = (startAngle * Math.PI) / 180;
                            const endRad = ((startAngle + segmentAngle - gapAngle) * Math.PI) / 180;

                            const x1 = centerX + outerRadius * Math.cos(startRad);
                            const y1 = centerY + outerRadius * Math.sin(startRad);
                            const x2 = centerX + outerRadius * Math.cos(endRad);
                            const y2 = centerY + outerRadius * Math.sin(endRad);
                            const x3 = centerX + innerRadius * Math.cos(endRad);
                            const y3 = centerY + innerRadius * Math.sin(endRad);
                            const x4 = centerX + innerRadius * Math.cos(startRad);
                            const y4 = centerY + innerRadius * Math.sin(startRad);

                            const largeArc = segmentAngle - gapAngle > 180 ? 1 : 0;

                            const pathD = [
                                `M ${x1} ${y1}`,
                                `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
                                `L ${x3} ${y3}`,
                                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
                                'Z'
                            ].join(' ');

                            let fillColor = '#E5E7EB'; // Gris por defecto
                            let fillOpacity = 0.4;

                            if (isFilled) {
                                // Alternar colores para efecto visual
                                fillColor = i % 2 === 0 ? '#192170' : '#C9A227';
                                fillOpacity = 1;
                            } else if (isPartial) {
                                fillColor = i % 2 === 0 ? '#192170' : '#C9A227';
                                fillOpacity = 0.5;
                            }

                            return (
                                <path
                                    key={i}
                                    d={pathD}
                                    fill={fillColor}
                                    opacity={fillOpacity}
                                    style={{
                                        transition: 'fill 0.3s ease, opacity 0.3s ease',
                                    }}
                                />
                            );
                        })}
                    </svg>
                )}

                {/* Anillo completo dorado cuando está al 100% */}
                {isUnlocked && (
                    <svg
                        className="absolute -inset-2"
                        width={svgSize + 16}
                        height={svgSize + 16}
                        style={{ pointerEvents: 'none' }}
                    >
                        {Array.from({ length: 24 }).map((_, i) => {
                            const segmentAngle = 360 / 24;
                            const startAngle = i * segmentAngle - 90;
                            const gapAngle = 4;

                            const centerX = (svgSize + 16) / 2;
                            const centerY = (svgSize + 16) / 2;
                            const outerRadius = (svgSize + 12) / 2;
                            const innerRadius = outerRadius - (strokeWidth + 2);

                            const startRad = (startAngle * Math.PI) / 180;
                            const endRad = ((startAngle + segmentAngle - gapAngle) * Math.PI) / 180;

                            const x1 = centerX + outerRadius * Math.cos(startRad);
                            const y1 = centerY + outerRadius * Math.sin(startRad);
                            const x2 = centerX + outerRadius * Math.cos(endRad);
                            const y2 = centerY + outerRadius * Math.sin(endRad);
                            const x3 = centerX + innerRadius * Math.cos(endRad);
                            const y3 = centerY + innerRadius * Math.sin(endRad);
                            const x4 = centerX + innerRadius * Math.cos(startRad);
                            const y4 = centerY + innerRadius * Math.sin(startRad);

                            const largeArc = segmentAngle - gapAngle > 180 ? 1 : 0;

                            const pathD = [
                                `M ${x1} ${y1}`,
                                `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
                                `L ${x3} ${y3}`,
                                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
                                'Z'
                            ].join(' ');

                            return (
                                <path
                                    key={i}
                                    d={pathD}
                                    fill={i % 2 === 0 ? '#192170' : '#C9A227'}
                                    className="animate-pulse"
                                    style={{
                                        animationDelay: `${i * 50}ms`,
                                    }}
                                />
                            );
                        })}
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
