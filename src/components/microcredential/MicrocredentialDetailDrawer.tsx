/**
 * MicrocredentialDetailDrawer - Panel lateral con detalles de la microcredencial
 * Diseño actualizado: Layout limpio, fondo claro, timeline de cursos + Certificado
 */

'use client';

import { MicrocredentialWithCourses } from '@/types/microcredential';
import { IconX, IconAward, IconClock, IconStar, IconBook, IconCertificate } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
    const [topbarHeight, setTopbarHeight] = useState(0);
    const [speakers, setSpeakers] = useState<Map<string, any>>(new Map());
    const [loadingData, setLoadingData] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const topbar = document.querySelector<HTMLElement>('[data-dashboard-topbar]');
        if (!topbar) {
            setTopbarHeight(0);
            return;
        }

        const update = () => setTopbarHeight(Math.ceil(topbar.getBoundingClientRect().height));
        update();

        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(update);
        observer.observe(topbar);
        return () => observer.disconnect();
    }, [isOpen]);

    // Cargar datos de instructores
    useEffect(() => {
        const loadCourseData = async () => {
            if (!microcredential || !isOpen) return;

            setLoadingData(true);
            try {
                const modules = [];
                if (microcredential.courseLevel1) modules.push(microcredential.courseLevel1);
                if (microcredential.courseLevel2) modules.push(microcredential.courseLevel2);

                // Cargar teachers (usando teacherIds del curso)
                const teacherIds = new Set<string>();
                modules.forEach(module => {
                    module.teacherIds?.forEach((id: string) => teacherIds.add(id));
                });

                const teachersMap = new Map();
                for (const teacherId of teacherIds) {
                    try {
                        const res = await fetch(`/api/users/${teacherId}`);
                        if (res.ok) {
                            const data = await res.json();
                            teachersMap.set(teacherId, data.user);
                        }
                    } catch (error) {
                        console.error(`Error loading teacher ${teacherId}:`, error);
                    }
                }
                setSpeakers(teachersMap);

                // Los ratings ahora vienen directamente del curso (averageRating, reviewsCount)
                // No necesitamos cargarlos por separado
            } catch (error) {
                console.error('Error loading course data:', error);
            } finally {
                setLoadingData(false);
            }
        };

        loadCourseData();
    }, [microcredential, isOpen]);

    // Renderizar siempre el componente base pero controlar visibilidad con CSS
    // para permitir animaciones de entrada/salida si fuera necesario
    if (!microcredential && !isOpen) return null;

    const {
        title,
        description,
        badgeImageUrl,
        courseLevel1,
        courseLevel2,
        slug,
    } = microcredential || {};

    const handleEnterCourse = () => {
        if (slug) {
            router.push(`/dashboard/catalog/microcredentials/${slug}`);
        }
    };

    // Construir lista de niveles para el timeline
    const modules = [];
    if (courseLevel1) modules.push({ ...courseLevel1, level: 1 });
    if (courseLevel2) modules.push({ ...courseLevel2, level: 2 });

    return (
        <>
            {/* Overlay - Backdrop */}
            <div
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div
                className={`fixed right-0 w-full sm:w-[500px] bg-white z-40 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                style={{
                    top: topbarHeight ? `${topbarHeight}px` : 0,
                    height: topbarHeight ? `calc(100dvh - ${topbarHeight}px)` : '100dvh',
                }}
            >
                {/* Contenido con Scroll */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                    {/* Botón Cerrar - sobre el contenido */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors z-50 p-2 hover:bg-gray-100 rounded-full"
                        aria-label="Cerrar panel"
                    >
                        <IconX size={20} stroke={2} />
                    </button>

                    <div className="px-8 pt-12 pb-6">

                        {/* Header: Badge y Títulos */}
                        <div className="flex flex-col items-center mb-10">
                            <div className="w-100 h-100 relative">
                                {badgeImageUrl ? (
                                    <img
                                        src={badgeImageUrl}
                                        alt={title}
                                        className="w-full h-full object-contain filter drop-shadow-xl"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center shadow-inner">
                                        <IconAward size={80} className="text-indigo-600" stroke={1.5} />
                                    </div>
                                )}
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight text-center mb-4">
                                {title}
                            </h2>

                            <div className="text-gray-600 text-[15px] leading-relaxed text-justify max-w-sm mx-auto">
                                {description || "Programa de formación especializada."}
                            </div>
                        </div>

                        {/* Timeline Section */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <IconAward size={20} className="text-gray-400" />
                                Ruta de certificación
                            </h3>

                            <div className="relative pl-4 space-y-8">
                                {modules.map((module, index) => {
                                    // Duración en semanas (placeholder por ahora)
                                    const weeks = 5; // TODO: Configurar en la plataforma

                                    // Obtener teacher real del curso (usando teacherIds)
                                    const teacher = module.teacherIds?.[0] ? speakers.get(module.teacherIds[0]) : null;

                                    // Obtener rating directamente del curso
                                    const averageRating = module.averageRating || 0;
                                    const reviewsCount = module.reviewsCount || 0;

                                    return (
                                        <div key={index} className="relative pl-12 group z-10">
                                            {/* Línea conectora desde el elemento anterior */}
                                            {index > 0 && (
                                                <div className="absolute left-[19px] top-[-32px] h-[calc(50%+32px)] w-[2px] z-0 bg-[repeating-linear-gradient(to_bottom,#10B981_0,#10B981_10px,transparent_10px,transparent_18px)]" />
                                            )}

                                            {/* Línea conectora al siguiente elemento */}
                                            {index < modules.length && (
                                                <div
                                                    className="absolute left-[19px] top-1/2 h-[calc(50%+32px)] w-[2px] z-0 bg-[repeating-linear-gradient(to_bottom,#10B981_0,#10B981_10px,transparent_10px,transparent_18px)]"
                                                />
                                            )}

                                            {/* Stepper Number */}
                                            <div className="absolute left-[4px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#10B981] border-[4px] border-white text-white flex items-center justify-center shadow-md z-10 font-bold text-sm">
                                                {index + 1}
                                            </div>

                                            {/* Tarjeta del Curso */}
                                            <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow flex gap-4">
                                                {/* Thumbnail */}
                                                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
                                                    {module.coverImageUrl || module.thumbnailUrl ? (
                                                        <img
                                                            src={module.thumbnailUrl || module.coverImageUrl || ''}
                                                            alt={module.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                                            <IconBook size={32} stroke={1.5} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 py-1 min-w-0 flex flex-col justify-center">
                                                    <div className="text-xs uppercase tracking-wider font-bold text-emerald-600 mb-1">
                                                        Nivel {module.level}
                                                    </div>
                                                    <h4 className="text-base font-bold text-gray-900 leading-snug mb-1 line-clamp-2">
                                                        {module.title}
                                                    </h4>

                                                    {/* Instructor */}
                                                    <p className="text-xs text-gray-600 mb-1.5">
                                                        Instructor: {teacher ? teacher.name : 'Por asignar'}
                                                    </p>

                                                    {/* Metadata: Duración y Rating en la misma línea */}
                                                    <div className="flex items-center gap-3 text-xs flex-wrap">
                                                        {/* Duración en semanas */}
                                                        <div className="flex items-center gap-1 text-gray-500">
                                                            <IconClock size={14} stroke={1.5} />
                                                            <span>{weeks} {weeks === 1 ? 'semana' : 'semanas'}</span>
                                                        </div>

                                                        {/* Rating */}
                                                        {reviewsCount > 0 ? (
                                                            <div className="flex items-center gap-1 text-gray-900 font-semibold">
                                                                <IconStar size={14} className="text-[#10B981] fill-current" stroke={0} />
                                                                <span>{averageRating.toFixed(1)}</span>
                                                                <span className="text-gray-500 font-normal">- ({reviewsCount} {reviewsCount === 1 ? 'reseña' : 'reseñas'})</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-gray-500 font-normal">
                                                                <IconStar size={14} stroke={1.5} />
                                                                <span>sin reseñas</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Item Final: Certificado */}
                                <div className="relative pl-12 group z-10">
                                    {/* Línea conectora desde el último nivel */}
                                    <div className="absolute left-[19px] top-[-32px] h-[calc(50%+32px)] w-[2px] z-0 bg-[repeating-linear-gradient(to_bottom,#10B981_0,#10B981_10px,transparent_10px,transparent_18px)]" />

                                    {/* Icono del timeline para certificado */}
                                    <div className="absolute left-[4px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#6366F1] border-[4px] border-white text-white flex items-center justify-center shadow-md z-10">
                                        <IconCertificate size={16} stroke={2.5} />
                                    </div>

                                    {/* Tarjeta de Certificado */}
                                    <div className="bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-xl p-4 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-600 border border-indigo-100">
                                            <IconAward size={24} stroke={1.5} />
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">
                                                Certificación Oficial
                                            </h4>
                                            <p className="text-xs text-gray-700 mt-0.5" title="Al completar los 2 cursos recibes tu certificación">
                                                Obtén tu insignia digital al completar los 2 niveles.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer fijo */}
                <div className="p-6 border-t border-gray-100 bg-white z-20">
                    <button
                        onClick={handleEnterCourse}
                        className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-lg rounded-xl transition-all shadow-[0_4px_14px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.6)] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isEnrolled ? (
                            <>
                                <span>Ingresar al Curso</span>
                            </>
                        ) : (
                            <>
                                <span>Inscribirse ahora</span>
                            </>
                        )}
                    </button>
                    {!isEnrolled && (
                        <p className="text-center text-xs text-gray-400 mt-3">
                            Acceso inmediato a los 2 niveles y certificación.
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
