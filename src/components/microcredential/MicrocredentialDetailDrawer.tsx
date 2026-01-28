/**
 * MicrocredentialDetailDrawer - Panel lateral con detalles de la microcredencial
 * Diseño con 2 pantallas: Resumen y Vista Previa del Nivel
 */

'use client';

import { MicrocredentialWithCourses } from '@/types/microcredential';
import { IconX, IconAward, IconClock, IconStar, IconBook, IconCertificate, IconArrowLeft, IconChevronRight, IconUser, IconListDetails, IconUsers } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import RichTextContent from '@/components/ui/RichTextContent';
import { Loader } from '@/components/common/Loader';

interface MicrocredentialDetailDrawerProps {
    microcredential: MicrocredentialWithCourses | null;
    isEnrolled?: boolean;
    isOpen: boolean;
    onClose: () => void;
}

// Colores del sistema de diseño
const COLORS = {
    primary: "#192170",
    emerald: "#10B981",
    indigo: "#6366F1",
    background: "#F1F5F9",
    surface: "#FFFFFF",
    text: {
        primary: "#111827",
        secondary: "#4B5563",
        muted: "#9CA3AF",
    },
    accent: {
        primarySoft: "#E8EAF6",
        emeraldSoft: "#D1FAE5",
        border: "rgba(15,23,42,0.10)",
    },
};

type ViewState = 'summary' | 'levelPreview';

interface CoursePreviewData {
    course: any;
    lessons: any[];
    teacher: any;
    enrolledCount: number;
}

// Componente para lección colapsable
interface CollapsibleLessonProps {
    lesson: any;
    index: number;
    subsections: any[];
}

function CollapsibleLesson({ lesson, index, subsections }: CollapsibleLessonProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const subsectionsCount = subsections.length;

    return (
        <div
            className="border rounded-lg overflow-hidden"
            style={{ borderColor: COLORS.accent.border }}
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
            >
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: COLORS.accent.primarySoft }}
                >
                    <IconBook size={16} style={{ color: COLORS.primary }} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="text-xs font-medium px-2 py-0.5 rounded"
                            style={{
                                backgroundColor: COLORS.accent.primarySoft,
                                color: COLORS.primary,
                            }}
                        >
                            Sección {index + 1}
                        </span>
                        {subsectionsCount > 0 && (
                            <span className="text-xs text-gray-500">
                                · {subsectionsCount} {subsectionsCount === 1 ? 'lección' : 'lecciones'}
                            </span>
                        )}
                    </div>
                    <h4 className="font-semibold text-sm" style={{ color: COLORS.text.primary }}>
                        {lesson.title}
                    </h4>
                </div>
                <IconChevronRight
                    size={18}
                    className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
            </button>

            {/* Subsections - Collapsible */}
            {isExpanded && subsectionsCount > 0 && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    <ul className="ml-11 mt-3 space-y-2">
                        {subsections.map((subsection: any, subIndex: number) => (
                            <li
                                key={subsection.id || `sub-${lesson.id}-${subIndex}`}
                                className="text-sm flex items-center gap-2"
                                style={{ color: COLORS.text.secondary }}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                {subsection.title || `Lección ${subIndex + 1}`}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
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

    // Estados para el sistema de 2 pantallas
    const [viewState, setViewState] = useState<ViewState>('summary');
    const [selectedLevel, setSelectedLevel] = useState<1 | 2>(1);
    const [levelPreviewData, setLevelPreviewData] = useState<CoursePreviewData | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Ref para la animación de transición
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when drawer closes
            setViewState('summary');
            setSelectedLevel(1);
            setLevelPreviewData(null);
            return;
        }

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

    // Cargar datos de instructores para el resumen
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

                // ✅ OPTIMIZACIÓN: Cargar todos los teachers en paralelo
                const teacherPromises = Array.from(teacherIds).map(async (teacherId) => {
                    try {
                        const res = await fetch(`/api/users/${teacherId}`);
                        if (res.ok) {
                            const data = await res.json();
                            return { id: teacherId, user: data.user };
                        }
                    } catch (error) {
                        console.error(`Error loading teacher ${teacherId}:`, error);
                    }
                    return null;
                });

                const results = await Promise.all(teacherPromises);
                const teachersMap = new Map();
                results.filter(Boolean).forEach((result: any) => {
                    teachersMap.set(result.id, result.user);
                });
                setSpeakers(teachersMap);
            } catch (error) {
                console.error('Error loading course data:', error);
            } finally {
                setLoadingData(false);
            }
        };

        loadCourseData();
    }, [microcredential, isOpen]);

    // Cargar datos del preview cuando se selecciona un nivel
    const loadLevelPreview = async (level: 1 | 2) => {
        if (!microcredential) return;

        const courseId = level === 1 ? microcredential.courseLevel1Id : microcredential.courseLevel2Id;
        if (!courseId) return;

        setLoadingPreview(true);
        try {
            // El endpoint getCoursePreview ahora incluye speakers directamente
            const courseRes = await fetch(`/api/student/getCoursePreview?courseId=${courseId}`);
            if (courseRes.ok) {
                const courseData = await courseRes.json();

                // Usar el primer speaker de la lista (ya viene en la respuesta)
                const teacher = courseData.speakers?.[0] || null;

                setLevelPreviewData({
                    course: courseData.course,
                    lessons: courseData.lessons || [],
                    teacher,
                    enrolledCount: courseData.enrolledCount || 0,
                });
            }
        } catch (error) {
            console.error('Error loading level preview:', error);
        } finally {
            setLoadingPreview(false);
        }
    };

    // Handler para abrir el preview de un nivel
    const handleOpenLevelPreview = async (level: 1 | 2) => {
        setSelectedLevel(level);
        setViewState('levelPreview');
        await loadLevelPreview(level);
    };

    // Handler para cambiar de nivel dentro del preview
    const handleSwitchLevel = async (level: 1 | 2) => {
        if (level === selectedLevel) return;
        setSelectedLevel(level);
        await loadLevelPreview(level);
    };

    // Handler para volver al resumen
    const handleBackToSummary = () => {
        setViewState('summary');
        setLevelPreviewData(null);
    };

    if (!microcredential && !isOpen) return null;

    const {
        title,
        description,
        badgeImageUrl,
        courseLevel1,
        courseLevel2,
        slug,
    } = microcredential || {};

    const handleEnterMicrocredential = () => {
        if (slug) {
            router.push(`/dashboard/catalog/microcredentials/${slug}`);
        }
    };

    const handleGoToLevel = (level: 1 | 2) => {
        const courseId = level === 1 ? microcredential?.courseLevel1Id : microcredential?.courseLevel2Id;
        if (courseId) {
            router.push(`/student/courses/${courseId}`);
        }
    };

    // Construir lista de niveles para el timeline
    const modules = [];
    if (courseLevel1) modules.push({ ...courseLevel1, level: 1 });
    if (courseLevel2) modules.push({ ...courseLevel2, level: 2 });

    // Parsear contenido de lecciones
    const parseLessonContent = (lesson: any) => {
        if (lesson.subsections && Array.isArray(lesson.subsections) && lesson.subsections.length > 0) {
            return { subsections: lesson.subsections };
        }
        if (lesson.parsedContent && lesson.parsedContent.subsections) {
            return lesson.parsedContent;
        }
        if (!lesson.content) return null;
        try {
            const parsed = typeof lesson.content === 'string' ? JSON.parse(lesson.content) : lesson.content;
            if (parsed && parsed.subsections && Array.isArray(parsed.subsections)) {
                return parsed;
            }
            return null;
        } catch {
            return null;
        }
    };

    const getTotalSubsections = () => {
        if (!levelPreviewData) return 0;
        let total = 0;
        levelPreviewData.lessons.forEach(lesson => {
            const content = parseLessonContent(lesson);
            if (content && content.subsections) {
                total += content.subsections.length;
            }
        });
        return total;
    };

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
                className={`fixed right-0 w-full sm:w-[540px] bg-white z-40 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                style={{
                    top: topbarHeight ? `${topbarHeight}px` : 0,
                    height: topbarHeight ? `calc(100dvh - ${topbarHeight}px)` : '100dvh',
                }}
            >
                {/* Header fijo */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-20">
                    {viewState === 'summary' ? (
                        <h2 className="text-lg font-bold text-gray-900">
                            Microcredencial
                        </h2>
                    ) : (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleBackToSummary}
                                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Volver al resumen"
                            >
                                <IconArrowLeft size={20} className="text-gray-600" />
                            </button>
                            <h2 className="text-lg font-bold text-gray-900">
                                Nivel {selectedLevel}
                            </h2>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                        aria-label="Cerrar panel"
                    >
                        <IconX size={20} stroke={2} />
                    </button>
                </div>

                {/* Contenido con animación de slide */}
                <div className="flex-1 overflow-hidden relative" ref={contentRef}>
                    <div
                        className="flex h-full transition-transform duration-300 ease-out"
                        style={{ transform: viewState === 'levelPreview' ? 'translateX(-100%)' : 'translateX(0)' }}
                    >
                        {/* Pantalla 1: Resumen de la Microcredencial */}
                        <div className="w-full h-full flex-shrink-0 overflow-y-auto overflow-x-hidden">
                            <div className="px-8 pt-8 pb-6">

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
                                            const weeks: number = 5; // TODO: Configurar en la plataforma

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

                                                    {/* Tarjeta del Curso - Clickeable */}
                                                    <button
                                                        onClick={() => handleOpenLevelPreview(module.level as 1 | 2)}
                                                        className="w-full text-left bg-white border border-gray-100 rounded-xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:border-emerald-200 transition-all duration-200 flex gap-4 group/card cursor-pointer"
                                                    >
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

                                                        {/* Chevron indicator */}
                                                        <div className="flex items-center justify-center text-gray-300 group-hover/card:text-emerald-500 transition-colors">
                                                            <IconChevronRight size={20} stroke={2} />
                                                        </div>
                                                    </button>
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

                        {/* Pantalla 2: Vista Previa del Nivel */}
                        <div className="w-full h-full flex-shrink-0 overflow-y-auto overflow-x-hidden flex flex-col">
                            {/* Switch de niveles */}
                            {courseLevel1 && courseLevel2 && (
                                <div className="px-6 pt-4 pb-2 bg-gray-50 border-b border-gray-100">
                                    <div className="inline-flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                                        <button
                                            onClick={() => handleSwitchLevel(1)}
                                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${selectedLevel === 1
                                                ? 'bg-emerald-500 text-white shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                        >
                                            Nivel 1
                                        </button>
                                        <button
                                            onClick={() => handleSwitchLevel(2)}
                                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${selectedLevel === 2
                                                ? 'bg-emerald-500 text-white shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                        >
                                            Nivel 2
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Contenido del Preview */}
                            <div className="flex-1 overflow-y-auto">
                                {loadingPreview ? (
                                    <div className="flex items-center justify-center h-full min-h-[300px]">
                                        <Loader />
                                    </div>
                                ) : levelPreviewData?.course ? (
                                    <div className="p-6">
                                        {/* Cover Image */}
                                        {levelPreviewData.course.coverImageUrl && (
                                            <div className="w-full h-48 rounded-xl overflow-hidden mb-6">
                                                <img
                                                    src={levelPreviewData.course.coverImageUrl}
                                                    alt={levelPreviewData.course.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}

                                        {/* Title */}
                                        <h1 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                                            {levelPreviewData.course.title}
                                        </h1>

                                        {/* Level badge */}
                                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-4 bg-emerald-100 text-emerald-700">
                                            Nivel {selectedLevel} de la Microcredencial
                                        </div>

                                        {/* Description */}
                                        {levelPreviewData.course.description && (
                                            <div className="mb-6">
                                                <RichTextContent html={levelPreviewData.course.description} />
                                            </div>
                                        )}

                                        {/* Meta Information */}
                                        <div className="space-y-4 mb-6">
                                            {/* Instructor */}
                                            {levelPreviewData.teacher && (
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                                        style={{ backgroundColor: COLORS.accent.primarySoft }}
                                                    >
                                                        <IconUser size={20} style={{ color: COLORS.primary }} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs" style={{ color: COLORS.text.muted }}>
                                                            Instructor
                                                        </p>
                                                        <p className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
                                                            {levelPreviewData.teacher.name} {levelPreviewData.teacher.lastName || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Duración */}
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: COLORS.accent.primarySoft }}
                                                >
                                                    <IconClock size={20} style={{ color: COLORS.primary }} />
                                                </div>
                                                <div>
                                                    <p className="text-xs" style={{ color: COLORS.text.muted }}>
                                                        Duración estimada
                                                    </p>
                                                    <p className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
                                                        5 semanas
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Contenido */}
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: COLORS.accent.primarySoft }}
                                                >
                                                    <IconListDetails size={20} style={{ color: COLORS.primary }} />
                                                </div>
                                                <div>
                                                    <p className="text-xs" style={{ color: COLORS.text.muted }}>
                                                        Contenido
                                                    </p>
                                                    <p className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
                                                        {levelPreviewData.lessons.length} {levelPreviewData.lessons.length === 1 ? 'sección' : 'secciones'}
                                                        {getTotalSubsections() > 0 && ` · ${getTotalSubsections()} lecciones`}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Usuarios inscritos */}
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: COLORS.accent.primarySoft }}
                                                >
                                                    <IconUsers size={20} style={{ color: COLORS.primary }} />
                                                </div>
                                                <div>
                                                    <p className="text-xs" style={{ color: COLORS.text.muted }}>
                                                        Inscritos
                                                    </p>
                                                    <p className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
                                                        {levelPreviewData.enrolledCount} {levelPreviewData.enrolledCount === 1 ? 'estudiante' : 'estudiantes'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lessons List (Temario) */}
                                        {levelPreviewData.lessons.length > 0 ? (
                                            <div className="mb-6">
                                                <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.text.primary }}>
                                                    Temario del Curso
                                                </h3>
                                                <div className="space-y-2">
                                                    {levelPreviewData.lessons.map((lesson, index) => {
                                                        const lessonContent = parseLessonContent(lesson);
                                                        const subsections = lessonContent?.subsections || [];

                                                        return (
                                                            <CollapsibleLesson
                                                                key={lesson.id}
                                                                lesson={lesson}
                                                                index={index}
                                                                subsections={subsections}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mb-6">
                                                <p className="text-sm" style={{ color: COLORS.text.muted }}>
                                                    No hay secciones disponibles para este nivel.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full min-h-[300px]">
                                        <p style={{ color: COLORS.text.muted }}>No se pudo cargar la información del nivel</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer contextual */}
                <div className="p-6 border-t border-gray-100 bg-white z-20">
                    {viewState === 'summary' ? (
                        // Footer del resumen
                        <>
                            <button
                                onClick={handleEnterMicrocredential}
                                className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-lg rounded-xl transition-all shadow-[0_4px_14px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.6)] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isEnrolled ? (
                                    <span>Ingresar al Curso</span>
                                ) : (
                                    <span>Inscribirse ahora</span>
                                )}
                            </button>
                            {!isEnrolled && (
                                <p className="text-center text-xs text-gray-400 mt-3">
                                    Acceso inmediato a los 2 niveles y certificación.
                                </p>
                            )}
                        </>
                    ) : (
                        // Footer del preview de nivel
                        <div className="space-y-3">
                            {isEnrolled ? (
                                <>
                                    <button
                                        onClick={() => handleGoToLevel(selectedLevel)}
                                        className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-lg rounded-xl transition-all shadow-[0_4px_14px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.6)] active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        Ir a Nivel {selectedLevel}
                                    </button>
                                    {courseLevel1 && courseLevel2 && (
                                        <button
                                            onClick={() => handleSwitchLevel(selectedLevel === 1 ? 2 : 1)}
                                            className="w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            Cambiar a Nivel {selectedLevel === 1 ? 2 : 1}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleEnterMicrocredential}
                                        className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-lg rounded-xl transition-all shadow-[0_4px_14px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.6)] active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        Inscribirse a la Microcredencial
                                    </button>
                                    <p className="text-center text-xs text-gray-400">
                                        Incluye acceso a ambos niveles y certificación oficial.
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
