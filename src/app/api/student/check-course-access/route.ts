/**
 * API: /api/student/check-course-access
 * Verifica el acceso de un estudiante a un curso
 * 
 * Lógica de control de acceso:
 * - CASO A: Curso pertenece a MC y estudiante INSCRITO → canAccess = true
 * - CASO B: Curso pertenece a MC pero NO inscrito → redirect a catálogo MC
 * - CASO C: Curso NO pertenece a ninguna MC → redirect a available-courses
 */

import { NextRequest, NextResponse } from 'next/server';
import { microcredentialRepository } from '@/lib/repositories/microcredentialRepository';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

// Tipos de respuesta
interface CourseAccessResponse {
    // Acceso permitido
    canAccess: boolean;

    // Información de microcredencial
    isMicrocredentialCourse: boolean;
    isEnrolledInMicrocredential: boolean;
    isLevel2Locked: boolean;

    // Datos de la microcredencial (si aplica)
    microcredentialId?: string;
    microcredentialSlug?: string;
    microcredentialTitle?: string;
    levelNumber?: 1 | 2;

    // Información del curso
    courseExists: boolean;
    courseTitle?: string;

    // Redirección sugerida
    redirectTo?: 'microcredential-catalog' | 'available-courses' | null;
    redirectUrl?: string;

    // Mensaje para el usuario
    message?: string;
}

/**
 * GET /api/student/check-course-access?courseId=xxx
 * Verifica si el estudiante puede acceder a un curso
 */
export async function GET(req: NextRequest) {
    try {
        const authUser = await getApiAuthUser();

        if (!authUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const courseId = req.nextUrl.searchParams.get('courseId');

        if (!courseId) {
            return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Verificar que el curso existe
        const { data: course, error: courseError } = await supabase
            .from(TABLES.COURSES)
            .select('id, title')
            .eq('id', courseId)
            .maybeSingle();

        if (courseError) {
            console.error('[check-course-access] Error consultando curso:', courseError);
        }

        if (courseError || !course) {
            return NextResponse.json({
                canAccess: false,
                courseExists: false,
                isMicrocredentialCourse: false,
                isEnrolledInMicrocredential: false,
                isLevel2Locked: false,
                message: `El curso no existe (error: ${courseError?.message || 'not found'})`,
            } as CourseAccessResponse);
        }

        // 2. Obtener el student_id del usuario
        const { data: student } = await supabase
            .from(TABLES.STUDENTS)
            .select('id')
            .eq('user_id', authUser.id)
            .maybeSingle();

        // 3. Buscar si el curso pertenece a ALGUNA microcredencial (global)
        const microcredentialInfo = await microcredentialRepository.findMicrocredentialByCourseId(courseId);

        // Si el curso NO pertenece a ninguna microcredencial
        if (!microcredentialInfo) {
            // Verificar si está inscrito al curso directamente
            let isEnrolledInCourse = false;
            if (student) {
                const { data: enrollment } = await supabase
                    .from(TABLES.STUDENT_ENROLLMENTS)
                    .select('id')
                    .eq('student_id', student.id)
                    .eq('course_id', courseId)
                    .maybeSingle();
                isEnrolledInCourse = !!enrollment;
            }

            return NextResponse.json({
                canAccess: isEnrolledInCourse,
                courseExists: true,
                courseTitle: course.title,
                isMicrocredentialCourse: false,
                isEnrolledInMicrocredential: false,
                isLevel2Locked: false,
                redirectTo: isEnrolledInCourse ? null : 'available-courses',
                redirectUrl: isEnrolledInCourse ? null : `/dashboard/available-courses?previewCourse=${courseId}`,
                message: isEnrolledInCourse
                    ? undefined
                    : 'Este curso no pertenece a ninguna microcredencial. Puedes inscribirte directamente.',
            } as CourseAccessResponse);
        }

        // El curso SÍ pertenece a una microcredencial
        // 4. Verificar si el estudiante está inscrito en ESA microcredencial
        if (!student) {
            // Sin perfil de estudiante, redirigir a catálogo de MC
            return NextResponse.json({
                canAccess: false,
                courseExists: true,
                courseTitle: course.title,
                isMicrocredentialCourse: true,
                isEnrolledInMicrocredential: false,
                isLevel2Locked: false,
                microcredentialId: microcredentialInfo.microcredentialId,
                microcredentialSlug: microcredentialInfo.microcredentialSlug,
                microcredentialTitle: microcredentialInfo.microcredentialTitle,
                levelNumber: microcredentialInfo.levelNumber,
                redirectTo: 'microcredential-catalog',
                redirectUrl: `/dashboard/catalog/microcredentials?openMc=${microcredentialInfo.microcredentialSlug}`,
                message: `Para acceder a este curso, debes inscribirte a la microcredencial "${microcredentialInfo.microcredentialTitle}".`,
            } as CourseAccessResponse);
        }

        // Verificar inscripción en la microcredencial
        const { data: mcEnrollment } = await supabase
            .from(TABLES.MICROCREDENTIAL_ENROLLMENTS)
            .select('id, level_1_completed, level_2_unlocked, payment_verified_at, acquisition_type')
            .eq('student_id', student.id)
            .eq('microcredential_id', microcredentialInfo.microcredentialId)
            .maybeSingle();

        // Si NO está inscrito en la microcredencial
        if (!mcEnrollment) {
            return NextResponse.json({
                canAccess: false,
                courseExists: true,
                courseTitle: course.title,
                isMicrocredentialCourse: true,
                isEnrolledInMicrocredential: false,
                isLevel2Locked: false,
                microcredentialId: microcredentialInfo.microcredentialId,
                microcredentialSlug: microcredentialInfo.microcredentialSlug,
                microcredentialTitle: microcredentialInfo.microcredentialTitle,
                levelNumber: microcredentialInfo.levelNumber,
                redirectTo: 'microcredential-catalog',
                redirectUrl: `/dashboard/catalog/microcredentials?openMc=${microcredentialInfo.microcredentialSlug}`,
                message: `Para acceder a "${course.title}", debes inscribirte a la microcredencial "${microcredentialInfo.microcredentialTitle}".`,
            } as CourseAccessResponse);
        }

        // ESTÁ inscrito en la microcredencial
        // 5. Verificar pago (si es de pago y no está verificado)
        const isPaid = mcEnrollment.acquisition_type === 'paid';
        const paymentVerified = !!mcEnrollment.payment_verified_at;

        if (isPaid && !paymentVerified) {
            return NextResponse.json({
                canAccess: false,
                courseExists: true,
                courseTitle: course.title,
                isMicrocredentialCourse: true,
                isEnrolledInMicrocredential: true,
                isLevel2Locked: false,
                microcredentialId: microcredentialInfo.microcredentialId,
                microcredentialSlug: microcredentialInfo.microcredentialSlug,
                microcredentialTitle: microcredentialInfo.microcredentialTitle,
                levelNumber: microcredentialInfo.levelNumber,
                redirectTo: 'microcredential-catalog',
                redirectUrl: `/dashboard/catalog/microcredentials?openMc=${microcredentialInfo.microcredentialSlug}`,
                message: 'Tu pago aún no ha sido verificado. Por favor, espera la confirmación.',
            } as CourseAccessResponse);
        }

        // 6. Verificar si es Nivel 2 y está bloqueado
        const isLevel2 = microcredentialInfo.levelNumber === 2;
        const isLevel2Locked = isLevel2 && !mcEnrollment.level_2_unlocked;

        if (isLevel2Locked) {
            return NextResponse.json({
                canAccess: false,
                courseExists: true,
                courseTitle: course.title,
                isMicrocredentialCourse: true,
                isEnrolledInMicrocredential: true,
                isLevel2Locked: true,
                microcredentialId: microcredentialInfo.microcredentialId,
                microcredentialSlug: microcredentialInfo.microcredentialSlug,
                microcredentialTitle: microcredentialInfo.microcredentialTitle,
                levelNumber: 2,
                message: 'Debes completar el Nivel 1 primero para acceder a este curso.',
            } as CourseAccessResponse);
        }

        // ACCESO PERMITIDO
        return NextResponse.json({
            canAccess: true,
            courseExists: true,
            courseTitle: course.title,
            isMicrocredentialCourse: true,
            isEnrolledInMicrocredential: true,
            isLevel2Locked: false,
            microcredentialId: microcredentialInfo.microcredentialId,
            microcredentialSlug: microcredentialInfo.microcredentialSlug,
            microcredentialTitle: microcredentialInfo.microcredentialTitle,
            levelNumber: microcredentialInfo.levelNumber,
        } as CourseAccessResponse);

    } catch (error: any) {
        console.error('[API check-course-access] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al verificar acceso' },
            { status: 500 }
        );
    }
}
