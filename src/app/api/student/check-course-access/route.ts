/**
 * API: /api/student/check-course-access
 * Verifica el acceso de un estudiante a un curso (lógica secuencial L1 -> L2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { microcredentialRepository } from '@/lib/repositories/microcredentialRepository';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

/**
 * GET /api/student/check-course-access?courseId=xxx
 * Verifica si el estudiante puede acceder a un curso
 * Retorna información sobre si es parte de una microcredencial y si está bloqueado
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

        // Obtener el student_id del usuario
        const supabase = getSupabaseAdmin();
        const { data: student } = await supabase
            .from(TABLES.STUDENTS)
            .select('id')
            .eq('user_id', authUser.id)
            .maybeSingle();

        if (!student) {
            // No tiene perfil de estudiante, acceso libre
            return NextResponse.json({
                canAccess: true,
                isMicrocredentialCourse: false,
                isLevel2Locked: false,
            });
        }

        // Verificar acceso usando el repository
        const accessInfo = await microcredentialRepository.checkCourseAccessForStudent(
            student.id,
            courseId
        );

        return NextResponse.json({
            canAccess: !accessInfo.isLevel2Locked,
            ...accessInfo,
            message: accessInfo.isLevel2Locked
                ? 'Debes completar el Nivel 1 primero para acceder a este curso.'
                : undefined,
        });
    } catch (error: any) {
        console.error('[API check-course-access] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al verificar acceso' },
            { status: 500 }
        );
    }
}
