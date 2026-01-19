/**
 * MicrocredentialCard - Tarjeta para mostrar microcredencial en catálogo
 */

'use client';

import { MicrocredentialWithCourses } from '@/types/microcredential';
import { IconAward, IconBook, IconClock, IconSparkles } from '@tabler/icons-react';
import Link from 'next/link';

interface MicrocredentialCardProps {
    microcredential: MicrocredentialWithCourses;
    isEnrolled?: boolean;
    onClick?: () => void;
}

export function MicrocredentialCard({
    microcredential,
    isEnrolled = false,
    onClick
}: MicrocredentialCardProps) {
    const {
        title,
        slug,
        shortDescription,
        badgeImageUrl,
        badgeColor,
        courseLevel1,
        courseLevel2,
        isFree,
        price,
        salePercentage,
        featured
    } = microcredential;

    // Calcular precio con descuento
    const finalPrice = salePercentage > 0
        ? price * (1 - salePercentage / 100)
        : price;

    // Duración total estimada
    const totalDuration = (courseLevel1?.durationMinutes || 0) + (courseLevel2?.durationMinutes || 0);
    const durationHours = Math.floor(totalDuration / 60);
    const durationMinutes = totalDuration % 60;

    return (
        <div
            onClick={onClick}
            className={`card bg-base-100 shadow-xl hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden ${featured ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
        >
            {/* Badge de destacado */}
            {featured && (
                <div className="absolute top-3 right-3 z-10">
                    <div className="badge badge-primary gap-1">
                        <IconSparkles size={14} />
                        Destacado
                    </div>
                </div>
            )}

            {/* Insignia */}
            <figure className="relative pt-8 pb-4 px-6 bg-gradient-to-br from-primary/5 to-secondary/5">
                <div
                    className="w-32 h-32 mx-auto rounded-full p-1 shadow-lg group-hover:scale-105 transition-transform"
                    style={{
                        background: badgeColor
                            ? `linear-gradient(135deg, ${badgeColor}20, ${badgeColor}40)`
                            : 'linear-gradient(135deg, #192170, #3C1970)'
                    }}
                >
                    <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                        {badgeImageUrl ? (
                            <img
                                src={badgeImageUrl}
                                alt={title}
                                className="w-full h-full object-contain p-2"
                            />
                        ) : (
                            <IconAward size={48} className="text-primary" />
                        )}
                    </div>
                </div>
            </figure>

            <div className="card-body pt-4">
                {/* Título */}
                <h2 className="card-title text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {title}
                </h2>

                {/* Descripción corta */}
                {shortDescription && (
                    <p className="text-sm text-base-content/70 line-clamp-2">
                        {shortDescription}
                    </p>
                )}

                {/* Cursos incluidos */}
                <div className="mt-3 space-y-1.5">
                    <div className="text-xs font-medium text-base-content/60 uppercase tracking-wide">
                        Incluye 2 Niveles:
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="badge badge-sm badge-outline">Nivel 1</span>
                        <span className="truncate">{courseLevel1?.title || 'Curso no definido'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="badge badge-sm badge-outline">Nivel 2</span>
                        <span className="truncate">{courseLevel2?.title || 'Curso no definido'}</span>
                    </div>
                </div>

                {/* Duración */}
                {totalDuration > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-base-content/60 mt-2">
                        <IconClock size={16} />
                        <span>
                            {durationHours > 0 && `${durationHours}h `}
                            {durationMinutes > 0 && `${durationMinutes}min`}
                            {totalDuration === 0 && 'Duración no especificada'}
                        </span>
                    </div>
                )}

                {/* Precio y CTA */}
                <div className="card-actions justify-between items-center mt-4 pt-4 border-t border-base-200">
                    <div>
                        {isFree ? (
                            <span className="text-lg font-bold text-success">Gratis</span>
                        ) : (
                            <div className="flex items-center gap-2">
                                {salePercentage > 0 && (
                                    <span className="text-sm text-base-content/50 line-through">
                                        ${price.toLocaleString()}
                                    </span>
                                )}
                                <span className="text-lg font-bold text-primary">
                                    ${finalPrice.toLocaleString()}
                                </span>
                                {salePercentage > 0 && (
                                    <span className="badge badge-sm badge-error">
                                        -{salePercentage}%
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {isEnrolled ? (
                        <span className="badge badge-success gap-1">
                            <IconBook size={14} />
                            Inscrito
                        </span>
                    ) : (
                        <Link
                            href={`/dashboard/catalog/microcredentials/${slug}`}
                            className="btn btn-sm btn-primary"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Ver Detalles
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
