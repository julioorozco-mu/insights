/**
 * API: /api/student/enrolled-courses-full
 * Endpoint consolidado para obtener cursos inscritos con todos sus detalles
 * Optimizado para eliminar N+1 queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';

interface EnrolledCourseWithDetails {
    id: string;
    courseId: string;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    averageRating: number;
    reviewsCount: number;
    progress: number;
    completedLessons: string[];
    lastAccessedLessonId: string | null;
    enrolledAt: string;
    lessonCount: number;
    teacher: {
        id: string;
        name: string;
        avatarUrl: string | null;
    } | null;
    microcredentialAccess: {
        isMicrocredentialCourse: boolean;
        isLevel2Locked: boolean;
        microcredentialId: string | null;
        levelNumber: number | null;
    } | null;
}

export async function GET(req: NextRequest) {
    try {
        const authUser = await getApiAuthUser();

        if (!authUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        if (authUser.role !== 'student') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Buscar el registro de estudiante
        const { data: student, error: studentError } = await supabaseAdmin
            .from(TABLES.STUDENTS)
            .select('id')
            .eq('user_id', authUser.id)
            .maybeSingle();

        if (studentError) {
            console.error('[enrolled-courses-full API] Error:', studentError);
            return NextResponse.json({ error: 'Error obteniendo registro de estudiante' }, { status: 500 });
        }

        if (!student) {
            return NextResponse.json({ courses: [] }, { status: 200 });
        }

        // ✅ Query consolidada: Obtener enrollments con course data en una sola query
        const { data: enrollmentsWithCourses, error: enrollmentError } = await supabaseAdmin
            .from(TABLES.STUDENT_ENROLLMENTS)
            .select(`
        id,
        course_id,
        enrolled_at,
        progress,
        completed_lessons,
        last_accessed_lesson_id,
        courses!inner (
          id,
          title,
          description,
          cover_image_url,
          teacher_ids,
          average_rating,
          reviews_count,
          is_active
        )
      `)
            .eq('student_id', student.id)
            .order('enrolled_at', { ascending: false });

        if (enrollmentError) {
            console.error('[enrolled-courses-full API] Error:', enrollmentError);
            return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
        }

        if (!enrollmentsWithCourses || enrollmentsWithCourses.length === 0) {
            return NextResponse.json({ courses: [] }, { status: 200 });
        }

        // Obtener IDs de cursos para queries adicionales
        const courseIds = enrollmentsWithCourses.map(e => (e.courses as any).id);

        // ✅ Ejecutar queries adicionales en paralelo
        const [lessonsCountResult, teachersResult, microcredentialsResult] = await Promise.all([
            // Conteo de lecciones por curso
            supabaseAdmin
                .from(TABLES.LESSONS)
                .select('course_id')
                .in('course_id', courseIds)
                .eq('is_active', true),

            // Obtener todos los teacher IDs únicos
            (async () => {
                const teacherIds = new Set<string>();
                enrollmentsWithCourses.forEach(e => {
                    const course = e.courses as any;
                    if (course.teacher_ids && Array.isArray(course.teacher_ids)) {
                        course.teacher_ids.forEach((id: string) => teacherIds.add(id));
                    }
                });

                if (teacherIds.size === 0) return { data: [] };

                return supabaseAdmin
                    .from(TABLES.USERS)
                    .select('id, name, avatar_url')
                    .in('id', Array.from(teacherIds));
            })(),

            // Verificar microcredenciales
            supabaseAdmin
                .from('microcredentials')
                .select('id, course_level_1_id, course_level_2_id')
                .or(`course_level_1_id.in.(${courseIds.join(',')}),course_level_2_id.in.(${courseIds.join(',')})`)
        ]);

        // Construir mapa de conteo de lecciones
        const lessonCountMap = new Map<string, number>();
        if (lessonsCountResult.data) {
            lessonsCountResult.data.forEach(l => {
                const count = lessonCountMap.get(l.course_id) || 0;
                lessonCountMap.set(l.course_id, count + 1);
            });
        }

        // Construir mapa de teachers
        const teachersMap = new Map<string, { id: string; name: string; avatarUrl: string | null }>();
        if (teachersResult.data) {
            teachersResult.data.forEach((t: any) => {
                teachersMap.set(t.id, {
                    id: t.id,
                    name: t.name,
                    avatarUrl: t.avatar_url
                });
            });
        }

        // Construir mapa de microcredenciales
        const microcredentialMap = new Map<string, { mcId: string; level: number; otherCourseId: string }>();
        if (microcredentialsResult.data) {
            microcredentialsResult.data.forEach((mc: any) => {
                microcredentialMap.set(mc.course_level_1_id, {
                    mcId: mc.id,
                    level: 1,
                    otherCourseId: mc.course_level_2_id
                });
                microcredentialMap.set(mc.course_level_2_id, {
                    mcId: mc.id,
                    level: 2,
                    otherCourseId: mc.course_level_1_id
                });
            });
        }

        // Verificar inscripciones de microcredenciales del estudiante
        const microcredentialIds = Array.from(new Set(
            Array.from(microcredentialMap.values()).map(mc => mc.mcId)
        ));

        let mcEnrollmentsMap = new Map<string, { level1Completed: boolean }>();
        if (microcredentialIds.length > 0) {
            const { data: mcEnrollments } = await supabaseAdmin
                .from('microcredential_enrollments')
                .select('microcredential_id, level_1_completed')
                .eq('student_id', student.id)
                .in('microcredential_id', microcredentialIds);

            if (mcEnrollments) {
                mcEnrollments.forEach((mce: any) => {
                    mcEnrollmentsMap.set(mce.microcredential_id, {
                        level1Completed: mce.level_1_completed
                    });
                });
            }
        }

        // Mapear resultados
        const courses: EnrolledCourseWithDetails[] = enrollmentsWithCourses
            .filter(e => (e.courses as any).is_active)
            .map(enrollment => {
                const course = enrollment.courses as any;
                const teacherId = course.teacher_ids?.[0];
                const teacher = teacherId ? teachersMap.get(teacherId) || null : null;

                // Verificar acceso de microcredencial
                const mcInfo = microcredentialMap.get(course.id);
                let microcredentialAccess = null;

                if (mcInfo) {
                    const mcEnrollment = mcEnrollmentsMap.get(mcInfo.mcId);
                    const isLevel2Locked = mcInfo.level === 2 && !(mcEnrollment?.level1Completed);

                    microcredentialAccess = {
                        isMicrocredentialCourse: true,
                        isLevel2Locked,
                        microcredentialId: mcInfo.mcId,
                        levelNumber: mcInfo.level
                    };
                }

                return {
                    id: enrollment.id,
                    courseId: course.id,
                    title: course.title,
                    description: course.description,
                    coverImageUrl: course.cover_image_url,
                    averageRating: course.average_rating || 0,
                    reviewsCount: course.reviews_count || 0,
                    progress: enrollment.progress || 0,
                    completedLessons: enrollment.completed_lessons || [],
                    lastAccessedLessonId: enrollment.last_accessed_lesson_id,
                    enrolledAt: enrollment.enrolled_at,
                    lessonCount: lessonCountMap.get(course.id) || 0,
                    teacher,
                    microcredentialAccess
                };
            });

        return NextResponse.json({
            courses,
            stats: {
                total: courses.length,
                inProgress: courses.filter(c => c.progress > 0 && c.progress < 100).length,
                completed: courses.filter(c => c.progress >= 100).length,
                notStarted: courses.filter(c => c.progress === 0).length
            }
        }, { status: 200 });

    } catch (e: any) {
        console.error('[enrolled-courses-full API] Error:', e);
        return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
    }
}
