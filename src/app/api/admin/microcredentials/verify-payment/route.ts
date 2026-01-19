/**
 * API: /api/admin/microcredentials/verify-payment
 * Verificar pago de transferencia para inscripción
 */

import { NextRequest, NextResponse } from 'next/server';
import { microcredentialRepository } from '@/lib/repositories/microcredentialRepository';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';

/**
 * GET /api/admin/microcredentials/verify-payment
 * Obtener lista de pagos pendientes de verificación
 */
export async function GET(req: NextRequest) {
    try {
        const authUser = await getApiAuthUser();

        if (!authUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        if (!['admin', 'superadmin'].includes(authUser.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const pendingPayments = await microcredentialRepository.getPendingPayments();

        return NextResponse.json({ pendingPayments });
    } catch (error: any) {
        console.error('[API verify-payment GET] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al obtener pagos pendientes' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/microcredentials/verify-payment
 * Verificar un pago específico
 */
export async function POST(req: NextRequest) {
    try {
        const authUser = await getApiAuthUser();

        if (!authUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        if (!['admin', 'superadmin'].includes(authUser.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await req.json();
        const { enrollmentId } = body;

        if (!enrollmentId) {
            return NextResponse.json(
                { error: 'enrollmentId es requerido' },
                { status: 400 }
            );
        }

        const enrollment = await microcredentialRepository.verifyPayment(enrollmentId, authUser.id);

        return NextResponse.json({
            enrollment,
            success: true,
            message: 'Pago verificado exitosamente',
        });
    } catch (error: any) {
        console.error('[API verify-payment POST] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al verificar pago' },
            { status: 500 }
        );
    }
}
