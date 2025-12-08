import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const body = await request.json();

    // Verificar que existe
    const { data: existing, error: findError } = await supabaseAdmin
      .from('linked_tests')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return NextResponse.json(
        { error: 'Vinculación no encontrada' },
        { status: 404 }
      );
    }

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

    // Verificar que existe
    const { data: existing, error: findError } = await supabaseAdmin
      .from('linked_tests')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return NextResponse.json(
        { error: 'Vinculación no encontrada' },
        { status: 404 }
      );
    }

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

