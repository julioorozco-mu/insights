/**
 * MicrocredentialDetailDrawer - Panel lateral con detalles de la microcredencial
 * Diseño ajustado para réplica exacta: Fondo oscuro glassmorphism y detalles precisos
 */

'use client';

import { MicrocredentialWithCourses } from '@/types/microcredential';
import { IconX, IconAward } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface MicrocredentialDetailDrawerProps {
    microcredential: MicrocredentialWithCourses | null;
    isEnrolled?: boolean;
    isOpen: boolean;
    onClose: () => void;
}

export function MicrocredentialDetailDrawer({
    microcredential,
    isEnrolled = false,
    isOpen,
    onClose
}: MicrocredentialDetailDrawerProps) {
    const router = useRouter();

    if (!microcredential) return null;

    const {
        title,
        description,
        badgeImageUrl,
        courseLevel1,
        courseLevel2,
        slug,
    } = microcredential;

    const handleEnterCourse = () => {
        router.push(`/dashboard/catalog/microcredentials/${slug}`);
    };

    // Construir lista de módulos
    const modules = [];
    if (courseLevel1) {
        modules.push({ level: 1, title: courseLevel1.title });
    }
    if (courseLevel2) {
        modules.push({ level: 2, title: courseLevel2.title });
    }

    return (
        <>
            {/* Drawer Panel - Con backdrop-blur para desenfocar SOLO lo que está detrás */}
            <div
                className={`fixed top-[88px] right-0 h-[calc(100vh-88px)] w-full sm:w-[500px] bg-[#1a2c32]/95 backdrop-blur-xl z-40 shadow-2xl transform transition-transform duration-300 ease-out border-l border-white/10 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full relative">

                    {/* Botón de cerrar (X) */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-20 focus:outline-none"
                    >
                        <IconX size={24} stroke={2} />
                    </button>

                    {/* Contenido scrolleable */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="px-10 pt-16 pb-8">

                            {/* Insignia Principal - Sin fondo blanco */}
                            <div className="flex justify-center mb-8 relative">
                                {/* Glow sutil detrás */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

                                <div className="w-120 h-120 relative z-10 transition-transform hover:scale-110 duration-500">
                                    {badgeImageUrl ? (
                                        <img
                                            src={badgeImageUrl}
                                            alt={title}
                                            className="w-full h-full object-contain drop-shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center shadow-2xl">
                                            <IconAward size={100} className="text-white" stroke={1.5} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Título de la Microcredencial */}
                            <h2 className="text-3xl font-bold text-white leading-tight mb-8 text-left tracking-tight">
                                {title}
                            </h2>

                            {/* Resumen */}
                            <div className="mb-8">
                                <p className="text-gray-300 text-[15px] leading-relaxed font-light">
                                    <span className="font-bold text-white block mb-1">Resumen:</span>
                                    {description || "Un programa diseñado para fortalecer los valores democráticos, en un plan de estudios integral."}
                                </p>
                            </div>

                            {/* Niveles/Módulos */}
                            {modules.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="font-bold text-white block mb-2 text-[15px]">Niveles:</h3>
                                    <ul className="space-y-4">
                                        {modules.map((module, index) => (
                                            <li
                                                key={index}
                                                className="flex items-start gap-3 group"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-2 group-hover:scale-150 transition-transform" />
                                                <span className="text-gray-200 text-sm font-light">
                                                    <span className="font-medium text-white/90">Nivel {module.level}:</span> {module.title}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer con Botón de Acción Fijo */}
                    <div className="p-8 pt-4 bg-gradient-to-t from-[#132025] to-transparent">
                        <button
                            onClick={handleEnterCourse}
                            className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-base rounded-[10px] transition-all duration-200 shadow-lg hover:shadow-emerald-900/40 active:transform active:scale-[0.98]"
                        >
                            {isEnrolled ? 'Ingresar al Curso' : 'Ver Detalles'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
