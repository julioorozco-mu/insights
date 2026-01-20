/**
 * API: /api/users/[id]
 * GET - Obtener información pública de un usuario por ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/lib/repositories/userRepository';

interface Params {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]
 * Obtener información pública de un usuario
 */
export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
        }

        const user = await userRepository.findById(id);

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        // Solo devolver información pública
        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                avatarUrl: user.avatarUrl,
            }
        });
    } catch (error: any) {
        console.error('[API /api/users/[id] GET] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al obtener usuario' },
            { status: 500 }
        );
    }
}
