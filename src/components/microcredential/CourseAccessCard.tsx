/**
 * CourseAccessCard - Tarjeta de curso con estado de bloqueo
 */

'use client';

import Link from 'next/link';
import { IconLock, IconPlayerPlay, IconCheck, IconBook } from '@tabler/icons-react';

interface CourseAccessCardProps {
    courseId: string;
    title: string;
    description?: string | null;
    coverImageUrl?: string | null;
    level: 1 | 2;
    isLocked: boolean;
    isCompleted: boolean;
    progress?: number;
    onLockedClick?: () => void;
}

export function CourseAccessCard({
    courseId,
    title,
    description,
    coverImageUrl,
    level,
    isLocked,
    isCompleted,
    progress = 0,
    onLockedClick,
}: CourseAccessCardProps) {

    const cardContent = (
        <div className={`card card-side bg-base-100 shadow-md hover:shadow-lg transition-all ${isLocked ? 'opacity-70 grayscale' : ''
            }`}>
            {/* Imagen o placeholder */}
            <figure className="w-32 flex-shrink-0">
                {coverImageUrl ? (
                    <img
                        src={coverImageUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <IconBook size={32} className="text-primary/50" />
                    </div>
                )}
            </figure>

            <div className="card-body p-4 flex-1">
                {/* Badge de nivel */}
                <div className="flex items-center gap-2">
                    <span className={`badge ${isCompleted ? 'badge-success' : 'badge-primary'
                        } badge-sm`}>
                        Nivel {level}
                    </span>
                    {isCompleted && (
                        <span className="badge badge-success badge-outline badge-sm gap-1">
                            <IconCheck size={12} />
                            Completado
                        </span>
                    )}
                    {isLocked && (
                        <span className="badge badge-warning badge-sm gap-1">
                            <IconLock size={12} />
                            Bloqueado
                        </span>
                    )}
                </div>

                {/* Título */}
                <h3 className="card-title text-base line-clamp-1">{title}</h3>

                {/* Descripción */}
                {description && (
                    <p className="text-sm text-base-content/70 line-clamp-2">
                        {description}
                    </p>
                )}

                {/* Barra de progreso */}
                {!isLocked && !isCompleted && progress > 0 && (
                    <div className="w-full">
                        <div className="flex justify-between text-xs text-base-content/60 mb-1">
                            <span>Progreso</span>
                            <span>{progress}%</span>
                        </div>
                        <progress
                            className="progress progress-primary w-full"
                            value={progress}
                            max="100"
                        />
                    </div>
                )}

                {/* Botón de acción */}
                <div className="card-actions justify-end mt-2">
                    {isLocked ? (
                        <button
                            onClick={onLockedClick}
                            className="btn btn-sm btn-ghost gap-1"
                        >
                            <IconLock size={16} />
                            Completa el Nivel 1
                        </button>
                    ) : isCompleted ? (
                        <Link
                            href={`/dashboard/student/courses/${courseId}`}
                            className="btn btn-sm btn-outline btn-success gap-1"
                        >
                            <IconCheck size={16} />
                            Revisar
                        </Link>
                    ) : (
                        <Link
                            href={`/dashboard/student/courses/${courseId}`}
                            className="btn btn-sm btn-primary gap-1"
                        >
                            <IconPlayerPlay size={16} />
                            {progress > 0 ? 'Continuar' : 'Comenzar'}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );

    // Solo devolver el contenido de la tarjeta
    // Los links están en los botones de acción
    return cardContent;
}
