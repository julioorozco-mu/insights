/**
 * API: /api/microcredentials/[id]
 * CRUD individual para microcredenciales
 */

import { NextRequest, NextResponse } from 'next/server';
import { microcredentialRepository } from '@/lib/repositories/microcredentialRepository';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { UpdateMicrocredentialData } from '@/types/microcredential';

interface Params {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/microcredentials/[id]
 * Obtener microcredencial por ID o slug
 */
export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;

        // Regex para detectar si es un UUID válido
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isUuid = uuidRegex.test(id);

        let microcredential = null;

        // Si parece ser un UUID, buscar por ID primero
        if (isUuid) {
            microcredential = await microcredentialRepository.findById(id);
        }

        // Si no se encontró o no era UUID, buscar por slug
        if (!microcredential) {
            microcredential = await microcredentialRepository.findBySlug(id);
        }

        if (!microcredential) {
            return NextResponse.json({ error: 'Microcredencial no encontrada' }, { status: 404 });
        }

        // Si no está publicada, verificar que sea admin
        if (!microcredential.isPublished) {
            const authUser = await getApiAuthUser();
            if (!authUser || !['admin', 'superadmin'].includes(authUser.role)) {
                return NextResponse.json({ error: 'Microcredencial no encontrada' }, { status: 404 });
            }
        }

        return NextResponse.json({ microcredential });
    } catch (error: any) {
        console.error('[API /api/microcredentials/[id] GET] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al obtener microcredencial' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/microcredentials/[id]
 * Actualizar microcredencial (solo admin)
 */
export async function PUT(req: NextRequest, { params }: Params) {
    try {
        const authUser = await getApiAuthUser();

        if (!authUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        if (!['admin', 'superadmin'].includes(authUser.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();

        // Verificar que exista
        const existing = await microcredentialRepository.findById(id);
        if (!existing) {
            return NextResponse.json({ error: 'Microcredencial no encontrada' }, { status: 404 });
        }

        // Validar cursos diferentes si se están actualizando
        const newLevel1 = body.courseLevel1Id || existing.courseLevel1Id;
        const newLevel2 = body.courseLevel2Id || existing.courseLevel2Id;
        if (newLevel1 === newLevel2) {
            return NextResponse.json(
                { error: 'Nivel 1 y Nivel 2 deben ser cursos diferentes' },
                { status: 400 }
            );
        }

        const data: UpdateMicrocredentialData = {};

        if (body.title !== undefined) data.title = body.title;
        if (body.slug !== undefined) data.slug = body.slug;
        if (body.description !== undefined) data.description = body.description;
        if (body.shortDescription !== undefined) data.shortDescription = body.shortDescription;
        if (body.badgeImageUrl !== undefined) data.badgeImageUrl = body.badgeImageUrl;
        if (body.badgeLockedImageUrl !== undefined) data.badgeLockedImageUrl = body.badgeLockedImageUrl;
        if (body.badgeColor !== undefined) data.badgeColor = body.badgeColor;
        if (body.courseLevel1Id !== undefined) data.courseLevel1Id = body.courseLevel1Id;
        if (body.courseLevel2Id !== undefined) data.courseLevel2Id = body.courseLevel2Id;
        if (body.isFree !== undefined) data.isFree = body.isFree;
        if (body.price !== undefined) data.price = body.price;
        if (body.salePercentage !== undefined) data.salePercentage = body.salePercentage;
        if (body.isPublished !== undefined) data.isPublished = body.isPublished;
        if (body.isActive !== undefined) data.isActive = body.isActive;
        if (body.displayOrder !== undefined) data.displayOrder = body.displayOrder;
        if (body.featured !== undefined) data.featured = body.featured;

        const microcredential = await microcredentialRepository.update(id, data);

        return NextResponse.json({ microcredential, success: true });
    } catch (error: any) {
        console.error('[API /api/microcredentials/[id] PUT] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al actualizar microcredencial' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/microcredentials/[id]
 * Eliminar (desactivar) microcredencial (solo admin)
 */
export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        const authUser = await getApiAuthUser();

        if (!authUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        if (!['admin', 'superadmin'].includes(authUser.role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const { id } = await params;

        // Verificar que exista
        const existing = await microcredentialRepository.findById(id);
        if (!existing) {
            return NextResponse.json({ error: 'Microcredencial no encontrada' }, { status: 404 });
        }

        await microcredentialRepository.remove(id);

        return NextResponse.json({ success: true, message: 'Microcredencial desactivada' });
    } catch (error: any) {
        console.error('[API /api/microcredentials/[id] DELETE] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al eliminar microcredencial' },
            { status: 500 }
        );
    }
}
