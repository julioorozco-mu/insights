/**
 * API: /api/microcredentials/enroll
 * Inscripción de estudiante a microcredencial
 */

import { NextRequest, NextResponse } from 'next/server';
import { microcredentialRepository } from '@/lib/repositories/microcredentialRepository';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

/**
 * POST /api/microcredentials/enroll
 * Inscribir al estudiante autenticado en una microcredencial
 */
export async function POST(req: NextRequest) {
    try {
        const authUser = await getApiAuthUser();

        if (!authUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        if (authUser.role !== 'student') {
            return NextResponse.json(
                { error: 'Solo los estudiantes pueden inscribirse a microcredenciales' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { microcredentialId, paymentReference } = body;

        if (!microcredentialId) {
            return NextResponse.json(
                { error: 'microcredentialId es requerido' },
                { status: 400 }
            );
        }

        // Obtener la microcredencial
        const microcredential = await microcredentialRepository.findById(microcredentialId);

        if (!microcredential || !microcredential.isPublished || !microcredential.isActive) {
            return NextResponse.json(
                { error: 'Microcredencial no encontrada o no disponible' },
                { status: 404 }
            );
        }

        // Obtener el student_id del usuario
        const supabase = getSupabaseAdmin();
        const { data: student, error: studentError } = await supabase
            .from(TABLES.STUDENTS)
            .select('id')
            .eq('user_id', authUser.id)
            .maybeSingle();

        if (studentError) {
            console.error('[API /api/microcredentials/enroll] Error buscando estudiante:', studentError);
            return NextResponse.json(
                { error: 'Error obteniendo perfil de estudiante' },
                { status: 500 }
            );
        }

        // Si no existe el perfil de estudiante, crearlo
        let studentId: string;
        if (!student) {
            const { data: newStudent, error: createError } = await supabase
                .from(TABLES.STUDENTS)
                .insert({ user_id: authUser.id })
                .select('id')
                .single();

            if (createError || !newStudent) {
                console.error('[API /api/microcredentials/enroll] Error creando estudiante:', createError);
                return NextResponse.json(
                    { error: 'Error creando perfil de estudiante' },
                    { status: 500 }
                );
            }
            studentId = newStudent.id;
        } else {
            studentId = student.id;
        }

        // Verificar si ya está inscrito
        const existingEnrollment = await microcredentialRepository.getEnrollment(studentId, microcredentialId);

        if (existingEnrollment) {
            return NextResponse.json({
                enrollment: existingEnrollment,
                alreadyEnrolled: true,
                message: 'Ya estás inscrito en esta microcredencial',
            });
        }

        // Si es de pago y no tiene referencia, validar
        if (!microcredential.isFree && !paymentReference) {
            return NextResponse.json({
                requiresPayment: true,
                price: microcredential.price,
                message: 'Esta microcredencial requiere pago. Por favor proporciona la referencia de pago.',
            });
        }

        // Crear la inscripción
        const enrollment = await microcredentialRepository.enrollStudent(
            studentId,
            microcredentialId,
            microcredential.isFree,
            paymentReference
        );

        // Mensaje según tipo de adquisición
        const message = microcredential.isFree
            ? '¡Inscripción exitosa! Ya tienes acceso a los cursos.'
            : 'Inscripción registrada. Tu pago será verificado pronto.';

        return NextResponse.json({
            enrollment,
            success: true,
            message,
            paymentPending: !microcredential.isFree,
        }, { status: 201 });

    } catch (error: any) {
        console.error('[API /api/microcredentials/enroll] Error:', error);

        // Error de duplicado (ya inscrito)
        if (error.code === '23505') {
            return NextResponse.json({
                error: 'Ya estás inscrito en esta microcredencial',
                alreadyEnrolled: true,
            }, { status: 409 });
        }

        return NextResponse.json(
            { error: error.message || 'Error al inscribirse' },
            { status: 500 }
        );
    }
}
