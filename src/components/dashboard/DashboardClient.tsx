"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    ChevronLeft,
    ChevronRight,
    Activity,
    Clock3,
    Users,
    BookOpenCheck,
    BookOpen,
    GraduationCap,
    Award,
} from "lucide-react";
import { CourseCard } from "@/components/dashboard/course-card";
import { CourseListItem } from "@/components/dashboard/course-list-item";
import { ScheduleCard } from "@/components/dashboard/schedule-card";
import { ProductivityChartLazy } from "@/components/dashboard/productivity-chart-lazy";
import type { User, UserRole } from "@/types/user";

// Types from the aggregated API
interface RecommendedMicrocredential {
    id: string;
    title: string;
    slug: string;
    badgeImageUrl: string;
    isFree: boolean;
    price: number;
    salePercentage: number;
}

interface DashboardApiResponse {
    enrolledCourses: {
        course: {
            id: string;
            title: string;
            description: string | null;
            thumbnailUrl: string | null;
            coverImageUrl: string | null;
            difficulty: string | null;
            tags: string[] | null;
            averageRating: number;
            reviewsCount: number;
        };
        enrollment: {
            id: string;
            courseId: string;
            studentId: string;
            enrolledAt: string;
            progress: number;
            completedLessons: string[];
            subsectionProgress: Record<string, number>;
            lastAccessedLessonId: string | null;
        };
        lessonsCount: number;
        completedLessonsCount: number;
        progressPercent: number;
        studyTimeMinutes: number;
    }[];
    recommendedCourses: {
        courseId: string;
        level: string;
        title: string;
        description: string;
        students: number;
        lessons: number;
        rating: number;
        reviewsCount: number;
        thumbnail: string;
        teacherName?: string;
        teacherAvatarUrl?: string;
    }[];
    recommendedMicrocredentials: RecommendedMicrocredential[];
    enrolledMicrocredentialIds: string[];
    scheduleItems: {
        type: string;
        title: string;
        date: string;
        time: string;
        courseId: string;
        lessonId: string;
        lessonDate: string;
    }[];
    stats: {
        progressPercentage: number;
        completedCourses: number;
        coursesInProgress: number;
        totalStudyMinutes: number;
        completedMicrocredentials: number;
        microcredentialsInProgress: number;
    };
    favorites: string[];
}

interface EnrolledCourseData {
    course: {
        id: string;
        title: string;
        description?: string | null;
        thumbnailUrl?: string | null;
        coverImageUrl?: string | null;
    };
    lessonsCount: number;
    completedLessonsCount: number;
    progressPercent: number;
}

interface RecommendedCourse {
    level: "Introductorio" | "Intermedio" | "Avanzado";
    title: string;
    description: string;
    students: number;
    lessons: number;
    rating: number;
    reviewsCount: number;
    mentor: string;
    thumbnail: string;
    courseId: string;
    teacherName?: string;
    teacherAvatarUrl?: string;
}

interface ScheduleItem {
    type: string;
    title: string;
    date: string;
    time: string;
    courseId?: string;
    lessonId?: string;
}

interface StatItem {
    label: string;
    value: string;
    delta: string;
    icon: React.ElementType;
    accent: string;
    deltaColor: string;
}

interface DashboardClientProps {
    user: User;
    initialData?: DashboardApiResponse;
}

// Helper function to format study time
function formatStudyTime(totalMinutes: number): string {
    if (totalMinutes === 0) return "0 min";
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

// Helper to build calendar data
function buildCalendarData(
    scheduleItemsData: { lessonDate: string; title: string; courseName?: string }[]
) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    const startDayOfWeek = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startDayOfWeek; i++) {
        currentWeek.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    while (currentWeek.length > 0 && currentWeek.length < 7) {
        currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
        weeks.push(currentWeek);
    }

    const eventDaysSet = new Set<number>();
    const lessonsPerDayMap: Record<number, { lessons: { title: string; courseName: string }[] }> = {};

    for (const item of scheduleItemsData) {
        if (!item.lessonDate) continue;
        const lessonDate = new Date(item.lessonDate);
        if (lessonDate.getMonth() === currentMonth && lessonDate.getFullYear() === currentYear) {
            const dayNum = lessonDate.getDate();
            eventDaysSet.add(dayNum);

            if (!lessonsPerDayMap[dayNum]) {
                lessonsPerDayMap[dayNum] = { lessons: [] };
            }
            const parts = item.title.split(": ");
            const courseName = item.courseName || (parts.length > 1 ? parts[0] : "Curso");
            const lessonTitle = parts.length > 1 ? parts.slice(1).join(": ") : item.title;
            lessonsPerDayMap[dayNum].lessons.push({ title: lessonTitle, courseName });
        }
    }

    return {
        weeks,
        month: now.toLocaleDateString("es-ES", { month: "long" }),
        year: currentYear,
        eventDays: eventDaysSet,
        lessonsPerDay: lessonsPerDayMap,
    };
}

/**
 * Dashboard Client Component
 * Receives pre-fetched data from server and handles interactive state
 */
export function DashboardClient({ user, initialData }: DashboardClientProps) {
    const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
    const [favorites, setFavorites] = useState<Set<string>>(
        () => new Set(initialData?.favorites || [])
    );
    const [loadingFavorite, setLoadingFavorite] = useState<string | null>(null);

    // Process initial data
    const enrolledCourses = useMemo<EnrolledCourseData[]>(() => {
        if (!initialData) return [];
        return initialData.enrolledCourses.map((item) => ({
            course: {
                id: item.course.id,
                title: item.course.title,
                description: item.course.description,
                thumbnailUrl: item.course.thumbnailUrl,
                coverImageUrl: item.course.coverImageUrl,
            },
            lessonsCount: item.lessonsCount,
            completedLessonsCount: item.completedLessonsCount,
            progressPercent: item.progressPercent,
        }));
    }, [initialData]);

    const recommendedCourses = useMemo<RecommendedCourse[]>(() => {
        if (!initialData) return [];
        return initialData.recommendedCourses.map((item) => ({
            level: item.level as "Introductorio" | "Intermedio" | "Avanzado",
            title: item.title,
            description: item.description,
            students: item.students,
            lessons: item.lessons,
            rating: item.rating,
            reviewsCount: item.reviewsCount,
            mentor: "Instructor",
            thumbnail: item.thumbnail,
            courseId: item.courseId,
            teacherName: item.teacherName,
            teacherAvatarUrl: item.teacherAvatarUrl,
        }));
    }, [initialData]);

    const scheduleItems = useMemo<ScheduleItem[]>(() => {
        if (!initialData) return [];
        return initialData.scheduleItems.map((item) => ({
            type: item.type,
            title: item.title,
            date: item.date,
            time: item.time,
            courseId: item.courseId,
            lessonId: item.lessonId,
        }));
    }, [initialData]);

    const stats = useMemo<StatItem[]>(() => {
        if (!initialData) return [];
        const apiStats = initialData.stats;
        return [
            {
                label: "Microcredenciales Completadas",
                value: `${apiStats.completedMicrocredentials}`,
                delta: apiStats.completedMicrocredentials > 0 ? "¡Felicidades!" : "",
                icon: Award,
                accent: "bg-amber-100 text-amber-600",
                deltaColor: apiStats.completedMicrocredentials > 0 ? "text-brand-success" : "text-slate-400",
            },
            {
                label: "Microcursos Completados",
                value: `${apiStats.completedCourses}`,
                delta: apiStats.completedCourses > 0 ? "¡Bien!" : "",
                icon: BookOpenCheck,
                accent: "bg-brand-secondary/10 text-brand-secondary",
                deltaColor: "text-brand-success",
            },
            {
                label: "Microcredenciales en Progreso",
                value: `${apiStats.microcredentialsInProgress}`,
                delta: apiStats.microcredentialsInProgress > 0 ? "inscritos" : "",
                icon: GraduationCap,
                accent: "bg-teal-100 text-teal-600",
                deltaColor: "text-slate-400",
            },
            {
                label: "Cursos en Progreso",
                value: `${apiStats.coursesInProgress}`,
                delta: apiStats.coursesInProgress > 0 ? "en curso" : "",
                icon: BookOpen,
                accent: "bg-brand-primary/10 text-brand-primary",
                deltaColor: "text-slate-400",
            },
            {
                label: "Progreso General",
                value: `${apiStats.progressPercentage}%`,
                delta: apiStats.progressPercentage > 50 ? `+${apiStats.progressPercentage - 50}%` : "",
                icon: Activity,
                accent: "bg-brand-primary/10 text-brand-primary",
                deltaColor: apiStats.progressPercentage > 50 ? "text-brand-success" : "text-slate-400",
            },
            {
                label: "Tiempo Estudiado",
                value: formatStudyTime(apiStats.totalStudyMinutes),
                delta: apiStats.totalStudyMinutes > 0 ? "aprox." : "",
                icon: Clock3,
                accent: "bg-brand-secondary/10 text-brand-secondary",
                deltaColor: "text-slate-400",
            },
        ];
    }, [initialData]);

    const productivityData = useMemo(() => {
        if (!initialData) return [];
        const totalEnrolled = initialData.enrolledCourses.length;
        const totalCompletedLessons = initialData.enrolledCourses.reduce(
            (sum, e) => sum + e.completedLessonsCount,
            0
        );
        const totalLessons = initialData.enrolledCourses.reduce((sum, e) => sum + e.lessonsCount, 0);
        const apiStats = initialData.stats;

        const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
        return days.map((day) => {
            if (totalEnrolled === 0) {
                return { day, clases: 0, autoestudio: 0, tareas: 0 };
            }
            const clasesPercent =
                totalLessons > 0 ? Math.round((totalCompletedLessons / totalLessons) * 100) : 0;
            const autoestudioPercent = apiStats.progressPercentage;
            const tareasPercent =
                totalEnrolled > 0 ? Math.round((apiStats.completedCourses / totalEnrolled) * 100) : 0;
            return { day, clases: clasesPercent, autoestudio: autoestudioPercent, tareas: tareasPercent };
        });
    }, [initialData]);

    const calendarData = useMemo(() => {
        if (!initialData) {
            return {
                weeks: [] as (number | null)[][],
                month: "",
                year: new Date().getFullYear(),
                eventDays: new Set<number>(),
                lessonsPerDay: {} as Record<number, { lessons: { title: string; courseName: string }[] }>,
            };
        }
        return buildCalendarData(
            initialData.scheduleItems.map((item) => ({
                lessonDate: item.lessonDate,
                title: item.title,
            }))
        );
    }, [initialData]);

    // Memoized date info
    const dateInfo = useMemo(() => {
        const now = new Date();
        return {
            weekday: now.toLocaleDateString("es-ES", { weekday: "long" }),
            fullDate: now.toLocaleDateString("es-ES", { month: "long", day: "numeric", year: "numeric" }),
            today: now.getDate(),
        };
    }, []);

    // Memoized selected day lessons
    const selectedDayLessons = useMemo(() => {
        return selectedDay ? calendarData.lessonsPerDay[selectedDay]?.lessons || [] : [];
    }, [selectedDay, calendarData.lessonsPerDay]);

    // Toggle favorite handler
    const handleToggleFavorite = useCallback(
        async (courseId: string, e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!user || loadingFavorite) return;

            setLoadingFavorite(courseId);
            try {
                if (favorites.has(courseId)) {
                    const response = await fetch(
                        `/api/student/favorites?courseId=${courseId}&userId=${user.id}`,
                        { method: "DELETE" }
                    );
                    if (response.ok) {
                        setFavorites((prev) => {
                            const newSet = new Set(prev);
                            newSet.delete(courseId);
                            return newSet;
                        });
                    }
                } else {
                    const response = await fetch("/api/student/favorites", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ courseId, userId: user.id }),
                    });
                    if (response.ok) {
                        setFavorites((prev) => new Set([...prev, courseId]));
                    }
                }
            } catch (error) {
                console.error("Error toggling favorite:", error);
            } finally {
                setLoadingFavorite(null);
            }
        },
        [user, loadingFavorite, favorites]
    );

    // Check if user is admin role
    const isAdminRole =
        user?.role === "admin" || user?.role === "superadmin" || user?.role === "support";

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
            {/* Main Content - Two Columns */}
            <div className="flex flex-col gap-8 lg:flex-row">
                {/* Left Column - Main Content */}
                <div className="flex-1 space-y-8">
                    {/* 1. Microcredenciales Recomendadas - Carousel (hidden for admin roles) */}
                    {!isAdminRole && initialData?.recommendedMicrocredentials && (() => {
                        // Filtrar microcredenciales en las que NO está inscrito
                        const notEnrolledMicrocredentials = initialData.recommendedMicrocredentials.filter(
                            (mc) => !initialData.enrolledMicrocredentialIds?.includes(mc.id)
                        ).slice(0, 6);

                        if (notEnrolledMicrocredentials.length === 0) return null;

                        return (
                            <section>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-slate-900">
                                        Microcredenciales recomendadas
                                    </h2>
                                    <Link
                                        href="/dashboard/catalog/microcredentials"
                                        className="text-sm font-medium text-brand-secondary hover:underline"
                                    >
                                        Ver todas
                                    </Link>
                                </div>
                                {/* Carrusel con botones de navegación */}
                                <div className="relative group/carousel">
                                    {/* Botón anterior */}
                                    <button
                                        onClick={() => {
                                            const container = document.getElementById('microcredentials-carousel');
                                            if (container) {
                                                container.scrollBy({ left: -220, behavior: 'smooth' });
                                            }
                                        }}
                                        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/95 hover:bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 -translate-x-1/2"
                                        aria-label="Anterior"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                                    </button>

                                    {/* Contenedor del carrusel - con drag scroll */}
                                    <div
                                        id="microcredentials-carousel"
                                        className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none"
                                        style={{ scrollbarWidth: 'thin' }}
                                        onMouseDown={(e) => {
                                            const container = e.currentTarget;
                                            container.dataset.isDragging = 'true';
                                            container.dataset.hasMoved = 'false'; // Nuevo: rastrear si hubo movimiento
                                            container.dataset.startX = String(e.pageX - container.offsetLeft);
                                            container.dataset.scrollLeft = String(container.scrollLeft);
                                            container.style.scrollSnapType = 'none';
                                            container.style.scrollBehavior = 'auto';
                                        }}
                                        onMouseMove={(e) => {
                                            const container = e.currentTarget;
                                            if (container.dataset.isDragging !== 'true') return;
                                            e.preventDefault();
                                            const x = e.pageX - container.offsetLeft;
                                            const startX = Number(container.dataset.startX) || 0;
                                            const walk = (x - startX) * 1.5;

                                            // Marcar que hubo movimiento si el desplazamiento es mayor a 5px
                                            if (Math.abs(x - startX) > 5) {
                                                container.dataset.hasMoved = 'true';
                                            }

                                            container.scrollLeft = (Number(container.dataset.scrollLeft) || 0) - walk;
                                        }}
                                        onMouseUp={(e) => {
                                            const container = e.currentTarget;
                                            container.dataset.isDragging = 'false';
                                            container.style.scrollSnapType = 'x mandatory';
                                            container.style.scrollBehavior = 'smooth';
                                            // No resetear hasMoved aquí - se resetea después del click
                                        }}
                                        onMouseLeave={(e) => {
                                            const container = e.currentTarget;
                                            container.dataset.isDragging = 'false';
                                            container.dataset.hasMoved = 'false';
                                            container.style.scrollSnapType = 'x mandatory';
                                            container.style.scrollBehavior = 'smooth';
                                        }}
                                    >
                                        {notEnrolledMicrocredentials.map((mc) => (
                                            <Link
                                                key={mc.id}
                                                href={`/dashboard/catalog/microcredentials?openMc=${mc.slug}`}
                                                className="flex-shrink-0 snap-start group"
                                                style={{ width: 'calc((100% - 2 * 1rem) / 3)' }}
                                                onClick={(e) => {
                                                    // Prevenir navegación si hubo movimiento durante el drag
                                                    const container = document.getElementById('microcredentials-carousel');
                                                    if (container && container.dataset.hasMoved === 'true') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        // Resetear hasMoved después de prevenir el clic
                                                        container.dataset.hasMoved = 'false';
                                                    }
                                                }}
                                                onMouseDown={(e) => {
                                                    // Permitir que el evento se propague al contenedor padre
                                                }}
                                                draggable={false}
                                            >
                                                <div className="bg-white rounded-xl p-3 pb-2 h-full flex flex-col items-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1">
                                                    {/* Insignia */}
                                                    <div className="relative w-full aspect-square -mb-4 transition-transform duration-500 group-hover:scale-105 flex-shrink-0">
                                                        {/* Glow effect */}
                                                        <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                                        {mc.badgeImageUrl ? (
                                                            <img
                                                                src={mc.badgeImageUrl}
                                                                alt={mc.title}
                                                                className="w-full h-full object-contain drop-shadow-xl relative z-10"
                                                                draggable={false}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center shadow-lg border-2 border-yellow-500/30 relative z-10">
                                                                <Award className="w-16 h-16 text-white" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Título - Cerca de la insignia */}
                                                    <h3 className="text-[14px] font-bold text-gray-900 text-center leading-snug mb-2 h-[3rem] flex items-center justify-center line-clamp-2 px-1">
                                                        {mc.title}
                                                    </h3>

                                                    {/* Botón */}
                                                    <div className="w-full mt-auto px-1">
                                                        <button className="w-full py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md">
                                                            Inscribirme
                                                        </button>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>

                                    {/* Botón siguiente */}
                                    <button
                                        onClick={() => {
                                            const container = document.getElementById('microcredentials-carousel');
                                            if (container) {
                                                container.scrollBy({ left: 220, behavior: 'smooth' });
                                            }
                                        }}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/95 hover:bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 translate-x-1/2"
                                        aria-label="Siguiente"
                                    >
                                        <ChevronRight className="w-5 h-5 text-gray-700" />
                                    </button>


                                </div>
                            </section>
                        );
                    })()}

                    {/* 2. My Courses Section */}
                    <section>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-900">
                                {user?.role === "teacher" ? "Mis Cursos (Instructor)" : "Mis Cursos"}
                            </h2>
                            <Link
                                href={
                                    user?.role === "teacher" ? "/dashboard/my-courses" : "/dashboard/enrolled-courses"
                                }
                                className="text-sm font-medium text-brand-secondary hover:underline"
                            >
                                Ver todos
                            </Link>
                        </div>
                        {enrolledCourses.length > 0 ? (
                            <div className="space-y-4">
                                {enrolledCourses.slice(0, 4).map((item) => (
                                    <Link
                                        key={item.course.id}
                                        href={
                                            user?.role === "teacher"
                                                ? `/dashboard/my-courses/${item.course.id}/edit`
                                                : `/dashboard/student/courses/${item.course.id}`
                                        }
                                    >
                                        <CourseListItem
                                            title={item.course.title}
                                            sessions={`${item.completedLessonsCount}/${item.lessonsCount}`}
                                            thumbnail={
                                                item.course.thumbnailUrl ||
                                                item.course.coverImageUrl ||
                                                "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80"
                                            }
                                            avatars={[]}
                                            highlight={
                                                item.completedLessonsCount > 0 &&
                                                    item.completedLessonsCount < item.lessonsCount
                                                    ? "En progreso"
                                                    : item.completedLessonsCount >= item.lessonsCount && item.lessonsCount > 0
                                                        ? "Completado"
                                                        : undefined
                                            }
                                        />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                                <GraduationCap className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-slate-500">
                                    {user?.role === "teacher"
                                        ? "Aún no has creado ningún curso"
                                        : "Aún no estás inscrito en ningún curso"}
                                </p>
                                <Link
                                    href={
                                        user?.role === "teacher"
                                            ? "/dashboard/my-courses/new"
                                            : "/dashboard/available-courses"
                                    }
                                    className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
                                >
                                    {user?.role === "teacher" ? "Crear curso" : "Explorar cursos"}
                                </Link>
                            </div>
                        )}
                    </section>

                    {/* 3. Microcursos Recomendados (hidden for admin roles) */}
                    {!isAdminRole && (
                        <section>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-slate-900">
                                    Microcursos recomendados para ti
                                </h2>
                                <Link
                                    href="/dashboard/available-courses"
                                    className="text-sm font-medium text-brand-secondary hover:underline"
                                >
                                    Ver todos
                                </Link>
                            </div>
                            {recommendedCourses.length > 0 ? (
                                <div className="grid gap-6 md:grid-cols-2">
                                    {recommendedCourses.map((course, idx) => (
                                        <Link
                                            key={course.courseId}
                                            href={`/dashboard/student/courses/${course.courseId}`}
                                            className="block h-full"
                                        >
                                            <CourseCard
                                                {...course}
                                                priority={idx === 0}
                                                courseId={course.courseId}
                                                isFavorite={favorites.has(course.courseId)}
                                                loadingFavorite={loadingFavorite === course.courseId}
                                                onToggleFavorite={(e) => handleToggleFavorite(course.courseId, e)}
                                                teacherName={course.teacherName}
                                                teacherAvatarUrl={course.teacherAvatarUrl}
                                            />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                                    <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                                    <p className="mt-2 text-slate-500">No hay cursos recomendados disponibles</p>
                                    <Link
                                        href="/dashboard/available-courses"
                                        className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
                                    >
                                        Explorar cursos
                                    </Link>
                                </div>
                            )}
                        </section>
                    )}
                </div>

                {/* Right Column - Sidebar Widgets */}
                <div className="w-full space-y-6 lg:max-w-sm">
                    {/* Calendar Widget */}
                    <section className="rounded-3xl bg-white p-5 shadow-card-soft">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 capitalize">{dateInfo.weekday}</p>
                                <p className="text-xl font-semibold text-slate-900 capitalize">
                                    {dateInfo.fullDate}
                                </p>
                            </div>
                            {selectedDayLessons.length > 0 ? (
                                <div className="flex items-center gap-2">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary/10 text-brand-secondary">
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">
                                        {selectedDayLessons.length}{" "}
                                        {selectedDayLessons.length === 1 ? "clase" : "clases"}
                                    </span>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-400 italic">Sin clases</div>
                            )}
                        </div>
                        <div className="mt-6">
                            <div className="mb-4 flex items-center justify-between text-sm font-semibold text-slate-700">
                                <span className="capitalize">
                                    {calendarData.month} {calendarData.year}
                                </span>
                                <div className="flex gap-2 text-slate-400">
                                    <button className="rounded-full border border-slate-200 p-1" disabled>
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button className="rounded-full border border-slate-200 p-1" disabled>
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-slate-400">
                                {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((day) => (
                                    <span key={day}>{day}</span>
                                ))}
                            </div>
                            <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm">
                                {calendarData.weeks.flatMap((week, rowIndex) =>
                                    week.map((day, columnIndex) => {
                                        if (!day) {
                                            return <span key={`${rowIndex}-${columnIndex}`} className="h-9 w-9" />;
                                        }

                                        const isSelected = day === selectedDay;
                                        const hasEvent = calendarData.eventDays.has(day);
                                        const isToday = day === dateInfo.today;

                                        return (
                                            <button
                                                key={`${rowIndex}-${columnIndex}-${day}`}
                                                onClick={() => setSelectedDay(day)}
                                                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${isSelected
                                                    ? "bg-brand-secondary text-white"
                                                    : isToday
                                                        ? "bg-brand-primary/10 text-brand-primary"
                                                        : hasEvent
                                                            ? "text-slate-700 hover:bg-brand-secondary/10"
                                                            : "text-slate-700 hover:bg-slate-100"
                                                    }`}
                                            >
                                                <div className="flex flex-col items-center">
                                                    <span>{day}</span>
                                                    {hasEvent && (
                                                        <span
                                                            className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-brand-secondary"
                                                                }`}
                                                        />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                        {/* Lessons for selected day */}
                        {selectedDayLessons.length > 0 && (
                            <div className="mt-4 border-t border-slate-100 pt-4">
                                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                                    Clases del día
                                </p>
                                <div className="space-y-2">
                                    {selectedDayLessons.map((lesson, idx) => (
                                        <div key={idx} className="rounded-lg bg-slate-50 p-2">
                                            <p className="text-sm font-medium text-slate-900">{lesson.title}</p>
                                            <p className="text-xs text-slate-500">{lesson.courseName}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Schedule Cards */}
                    <section className="space-y-3">
                        {scheduleItems.length > 0 ? (
                            scheduleItems.map((item) => (
                                <ScheduleCard key={`${item.courseId}-${item.lessonId}`} {...item} />
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center">
                                <Clock3 className="mx-auto h-8 w-8 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-500">
                                    No hay clases programadas próximamente
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Overall Information */}
                    <section className="rounded-3xl bg-white p-5 shadow-card-soft">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900">Información General</h3>
                            <button className="text-sm font-medium text-brand-secondary">Ver todo</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {stats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="rounded-2xl border border-slate-100 p-4 flex flex-col items-center"
                                >
                                    <span
                                        className={`flex h-8 w-8 items-center justify-center rounded-full ${stat.accent}`}
                                    >
                                        <stat.icon className="h-4 w-4" />
                                    </span>
                                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-center min-h-[2rem] flex items-center justify-center">
                                        {stat.label}
                                    </p>
                                    <div className="mt-2 flex flex-col items-center justify-center">
                                        <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
                                        <span className={`text-xs font-semibold ${stat.deltaColor} min-h-[1.25rem]`}>
                                            {stat.delta || "\u00A0"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Productivity Chart - Lazy Loaded (hidden for admin roles) */}
                    {!isAdminRole && (
                        <section className="rounded-3xl bg-white p-5 shadow-card-soft">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Progreso Semanal</h3>
                                    <p className="text-sm text-slate-500">Tu actividad de estudio</p>
                                </div>
                            </div>
                            <ProductivityChartLazy data={productivityData} />
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
