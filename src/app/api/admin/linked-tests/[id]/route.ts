import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { teacherHasAccessToCourse } from '@/lib/auth/coursePermissions';

async function validateLinkedTestAccess(linkedTestId: string) {
  const authUser = await getApiAuthUser();

  if (!authUser) {
    return { ok: false as const, response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: linkedTest, error } = await supabaseAdmin
    .from('linked_tests')
    .select(
      `id, course_id, lesson_id, section_id,
      lesson:lessons(course_id),
      section:course_sections(course_id)`
    )
    .eq('id', linkedTestId)
    .maybeSingle();

  if (error) {
    console.error('[linked-tests/[id]] Error fetching linked test:', error);
    return { ok: false as const, response: NextResponse.json({ error: 'Error obteniendo vinculación' }, { status: 500 }) };
  }

  if (!linkedTest) {
    return { ok: false as const, response: NextResponse.json({ error: 'Vinculación no encontrada' }, { status: 404 }) };
  }

  const isAdmin =
    authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

  if (!isAdmin) {
    if (authUser.role !== 'teacher') {
      return { ok: false as const, response: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
    }

    const resolvedCourseId =
      (linkedTest as any).course_id ||
      (linkedTest as any).lesson?.course_id ||
      (linkedTest as any).section?.course_id ||
      null;

    if (!resolvedCourseId) {
      return { ok: false as const, response: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
    }

    try {
      const allowed = await teacherHasAccessToCourse(authUser.id, resolvedCourseId);
      if (!allowed) {
        return { ok: false as const, response: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
      }
    } catch (e) {
      console.error('[linked-tests/[id]] Error validating assigned course:', e);
      return { ok: false as const, response: NextResponse.json({ error: 'Error validando permisos' }, { status: 500 }) };
    }
  }

  return { ok: true as const, authUser, supabaseAdmin };
}

/**
 * GET /api/admin/linked-tests/[id]
 * Obtiene una vinculación específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const access = await validateLinkedTestAccess(id);
    if (!access.ok) return access.response;
    const supabaseAdmin = access.supabaseAdmin;

    const { data: linkedTest, error } = await supabaseAdmin
      .from('linked_tests')
      .select(`
        *,
        test:tests(id, title, status, time_mode, time_limit_minutes, passing_score),
        lesson:lessons(id, title, course_id),
        section:course_sections(id, title, course_id),
        course:courses(id, title)
      `)
      .eq('id', id)
      .single();

    if (error || !linkedTest) {
      return NextResponse.json(
        { error: 'Vinculación no encontrada' },
        { status: 404 }
      );
    }

    const transformedLinkedTest = {
      id: linkedTest.id,
      testId: linkedTest.test_id,
      lessonId: linkedTest.lesson_id,
      sectionId: linkedTest.section_id,
      courseId: linkedTest.course_id,
      isRequired: linkedTest.is_required,
      availableFrom: linkedTest.available_from,
      availableUntil: linkedTest.available_until,
      order: linkedTest.order,
      createdBy: linkedTest.created_by,
      createdAt: linkedTest.created_at,
      updatedAt: linkedTest.updated_at,
      test: linkedTest.test ? {
        id: linkedTest.test.id,
        title: linkedTest.test.title,
        status: linkedTest.test.status,
        timeMode: linkedTest.test.time_mode,
        timeLimitMinutes: linkedTest.test.time_limit_minutes,
        passingScore: linkedTest.test.passing_score,
      } : undefined,
      lesson: linkedTest.lesson ? {
        id: linkedTest.lesson.id,
        title: linkedTest.lesson.title,
        courseId: linkedTest.lesson.course_id,
      } : undefined,
      section: linkedTest.section ? {
        id: linkedTest.section.id,
        title: linkedTest.section.title,
        courseId: linkedTest.section.course_id,
      } : undefined,
      course: linkedTest.course ? {
        id: linkedTest.course.id,
        title: linkedTest.course.title,
      } : undefined,
    };

    return NextResponse.json({ linkedTest: transformedLinkedTest });
  } catch (error) {
    console.error('Error in GET /api/admin/linked-tests/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/linked-tests/[id]
 * Actualiza una vinculación
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const access = await validateLinkedTestAccess(id);
    if (!access.ok) return access.response;
    const supabaseAdmin = access.supabaseAdmin;

    const body = await request.json();

    // Preparar datos para actualización
    const updateData: Record<string, unknown> = {};

    if (body.isRequired !== undefined) updateData.is_required = body.isRequired;
    if (body.availableFrom !== undefined) updateData.available_from = body.availableFrom;
    if (body.availableUntil !== undefined) updateData.available_until = body.availableUntil;
    if (body.order !== undefined) updateData.order = body.order;

    const { data: linkedTest, error } = await supabaseAdmin
      .from('linked_tests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating linked test:', error);
      return NextResponse.json(
        { error: 'Error al actualizar la vinculación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      linkedTest: {
        id: linkedTest.id,
        testId: linkedTest.test_id,
        lessonId: linkedTest.lesson_id,
        sectionId: linkedTest.section_id,
        courseId: linkedTest.course_id,
        isRequired: linkedTest.is_required,
        availableFrom: linkedTest.available_from,
        availableUntil: linkedTest.available_until,
        order: linkedTest.order,
        createdBy: linkedTest.created_by,
        createdAt: linkedTest.created_at,
        updatedAt: linkedTest.updated_at,
      },
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/linked-tests/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/linked-tests/[id]
 * Elimina una vinculación
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const access = await validateLinkedTestAccess(id);
    if (!access.ok) return access.response;
    const supabaseAdmin = access.supabaseAdmin;

    // Eliminar
    const { error } = await supabaseAdmin
      .from('linked_tests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting linked test:', error);
      return NextResponse.json(
        { error: 'Error al eliminar la vinculación' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/linked-tests/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

