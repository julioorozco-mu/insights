/**
 * API: /api/microcredentials
 * Endpoints para microcredenciales (catálogo público y creación admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { microcredentialRepository } from '@/lib/repositories/microcredentialRepository';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { CreateMicrocredentialData } from '@/types/microcredential';

/**
 * GET /api/microcredentials
 * Lista de microcredenciales publicadas (catálogo público)
 * Query params:
 *   - featured: "true" para solo destacadas
 *   - all: "true" para admin (requiere autenticación)
 */
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const showAll = searchParams.get('all') === 'true';

        if (showAll) {
            // Verificar que sea admin
            const authUser = await getApiAuthUser();
            if (!authUser || !['admin', 'superadmin'].includes(authUser.role)) {
                return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
            }

            const microcredentials = await microcredentialRepository.findAll();
            return NextResponse.json({ microcredentials });
        }

        // Catálogo público
        const microcredentials = await microcredentialRepository.findAllPublished();

        // Filtrar por destacadas si se solicita
        const featured = searchParams.get('featured') === 'true';
        const filtered = featured
            ? microcredentials.filter(m => m.featured)
            : microcredentials;

        return NextResponse.json({ microcredentials: filtered });
    } catch (error: any) {
        console.error('[API /api/microcredentials GET] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al obtener microcredenciales' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/microcredentials
 * Crear nueva microcredencial (solo admin)
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

        // Validación básica
        const requiredFields = ['title', 'badgeImageUrl', 'courseLevel1Id', 'courseLevel2Id'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json(
                    { error: `El campo ${field} es requerido` },
                    { status: 400 }
                );
            }
        }

        // Validar que los cursos sean diferentes
        if (body.courseLevel1Id === body.courseLevel2Id) {
            return NextResponse.json(
                { error: 'Nivel 1 y Nivel 2 deben ser cursos diferentes' },
                { status: 400 }
            );
        }

        const data: CreateMicrocredentialData = {
            title: body.title,
            slug: body.slug,
            description: body.description,
            shortDescription: body.shortDescription,
            badgeImageUrl: body.badgeImageUrl,
            badgeLockedImageUrl: body.badgeLockedImageUrl,
            badgeColor: body.badgeColor,
            courseLevel1Id: body.courseLevel1Id,
            courseLevel2Id: body.courseLevel2Id,
            isFree: body.isFree ?? true,
            price: body.price ?? 0,
            salePercentage: body.salePercentage ?? 0,
            isPublished: body.isPublished ?? false,
            displayOrder: body.displayOrder ?? 0,
            featured: body.featured ?? false,
        };

        const microcredential = await microcredentialRepository.create(data, authUser.id);

        return NextResponse.json({ microcredential, success: true }, { status: 201 });
    } catch (error: any) {
        console.error('[API /api/microcredentials POST] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error al crear microcredencial' },
            { status: 500 }
        );
    }
}
