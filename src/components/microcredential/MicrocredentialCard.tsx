/**
 * MicrocredentialCard - Tarjeta para mostrar microcredencial en catálogo
 * Diseño renovado con estilo moderno y minimalista
 */

'use client';

import { MicrocredentialWithCourses } from '@/types/microcredential';
import { IconAward, IconCheck } from '@tabler/icons-react';

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
        badgeImageUrl,
        isFree,
        price,
        salePercentage,
    } = microcredential;

    // Calcular precio con descuento
    const finalPrice = salePercentage > 0
        ? price * (1 - salePercentage / 100)
        : price;
    return (
        <div
            onClick={onClick}
            className="group cursor-pointer h-full"
        >
            {/* Tarjeta principal - Fondo blanco completo con borde sutil y sombra suave */}
            <div className="bg-white rounded-[20px] p-6 h-full flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">

                {/* Área de la insignia - Centrada, GRANDE y protagonista */}
                <div className="flex items-center justify-center py-2 mb-2 flex-1">
                    <div className="w-150 h-150 flex items-center justify-center relative transition-transform duration-500 group-hover:scale-110">
                        {/* Glow effect detrás de la insignia - Más intenso */}
                        <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {badgeImageUrl ? (
                            <img
                                src={badgeImageUrl}
                                alt={title}
                                className="w-full h-full object-contain drop-shadow-2xl"
                            />
                        ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center p-1 shadow-lg border-2 border-yellow-500/30">
                                <IconAward size={64} className="text-white" stroke={1.5} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Contenido inferior */}
                <div>
                    {/* Título - Fuente Inter/Sans negrita */}
                    <h3 className="text-[17px] font-bold text-gray-900 leading-tight mb-8">
                        {title}
                    </h3>

                    {/* Footer: Precio y Estado */}
                    <div className="flex items-center justify-between mt-auto border-t border-transparent pt-2">
                        <div>
                            {isFree ? (
                                <span className="text-[15px] font-bold text-[#10B981]">Gratis</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-[15px] font-bold text-[#10B981]">
                                        ${finalPrice.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Badge Inscrito - Verde sólido estilo pill */}
                        {isEnrolled && (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#10B981] text-white text-[11px] font-bold uppercase tracking-wide rounded-full shadow-sm">
                                <IconCheck size={14} stroke={3} />
                                Inscrito
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
