/**
 * API: /api/student/my-credentials
 * Obtener las microcredenciales del estudiante autenticado
 */

import { NextRequest, NextResponse } from 'next/server';
import { microcredentialRepository } from '@/lib/repositories/microcredentialRepository';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

/**
 * GET /api/student/my-credentials
 * Obtiene todas las microcredenciales del estudiante con su estado de progreso
 */
export async function GET(req: NextRequest) {
    try {
        const authUser = await getApiAuthUser();

        if (!authUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Obtener el student_id del usuario
        const supabase = getSupabaseAdmin();
        const { data: student, error: studentError } = await supabase
            .from(TABLES.STUDENTS)
            .select('id')
            .eq('user_id', authUser.id)
            .maybeSingle();

        if (studentError) {
            console.error('[API /api/student/my-credentials] Error:', studentError);
            return NextResponse.json(
                { error: 'Error obteniendo perfil de estudiante' },
                { status: 500 }
            );
        }

        if (!student) {
            // No tiene perfil de estudiante, retornar vacío
            return NextResponse.json({
                enrollments: [],
                completed: [],
                inProgress: [],
            });
        }

        // Obtener todas las inscripciones del estudiante
        const enrollments = await microcredentialRepository.getStudentEnrollments(student.id);

        // Filtrar por estado
        const completed = enrollments.filter(e => e.status === 'completed' && e.badgeUnlocked);
        const inProgress = enrollments.filter(e => e.status === 'in_progress');
        const pendingPayment = enrollments.filter(e =>
            e.acquisitionType === 'paid' && !e.paymentVerifiedAt
        );

        return NextResponse.json({
            enrollments,
            completed,
            inProgress,
            pendingPayment,
            stats: {
                total: enrollments.length,
                completedCount: completed.length,
                inProgressCount: inProgress.length,
                pendingPaymentCount: pendingPayment.length,
            },
        });
    } catch (error: any) {
        console.error('[API /api/student/my-credentials] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al obtener credenciales' },
            { status: 500 }
        );
    }
}
