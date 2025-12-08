import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente de Supabase con service role para bypass de RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/course-tests
 * Lista los tests vinculados a cursos
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');

    let query = supabaseAdmin
      .from('course_tests')
      .select(`
        *,
        test:tests(id, title, description, status, time_mode, time_limit_minutes, passing_score, max_attempts),
        course:courses(id, title)
      `)
      .order('order', { ascending: true });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data: courseTests, error } = await query;

    if (error) {
      console.error('Error fetching course tests:', error);
      
      // Verificar si es error de tabla no existente
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'La tabla course_tests no existe. Ejecuta la migración SQL.',
            code: 'TABLE_NOT_FOUND'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Error al obtener los tests vinculados' },
        { status: 500 }
      );
    }

    // Transformar datos
    const transformedCourseTests = (courseTests || []).map(ct => ({
      id: ct.id,
      testId: ct.test_id,
      courseId: ct.course_id,
      isRequired: ct.is_required,
      availableFrom: ct.available_from,
      availableUntil: ct.available_until,
      order: ct.order,
      createdBy: ct.created_by,
      createdAt: ct.created_at,
      updatedAt: ct.updated_at,
      test: ct.test ? {
        id: ct.test.id,
        title: ct.test.title,
        description: ct.test.description,
        status: ct.test.status,
        timeMode: ct.test.time_mode,
        timeLimitMinutes: ct.test.time_limit_minutes,
        passingScore: ct.test.passing_score,
        maxAttempts: ct.test.max_attempts,
      } : undefined,
      course: ct.course ? {
        id: ct.course.id,
        title: ct.course.title,
      } : undefined,
    }));

    return NextResponse.json({ courseTests: transformedCourseTests });
  } catch (error) {
    console.error('Error in GET /api/admin/course-tests:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/course-tests
 * Vincula un test a un curso
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testId, courseId, createdBy, isRequired, availableFrom, availableUntil } = body;

    // Validar datos requeridos
    if (!testId || !courseId || !createdBy) {
      return NextResponse.json(
        { error: 'El test, curso y creador son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el test existe
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('id')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el curso existe
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Curso no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si ya existe una vinculación
    const { data: existing } = await supabaseAdmin
      .from('course_tests')
      .select('id')
      .eq('test_id', testId)
      .eq('course_id', courseId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Este test ya está vinculado a este curso' },
        { status: 409 }
      );
    }

    // Obtener el siguiente orden
    const { data: lastOrder } = await supabaseAdmin
      .from('course_tests')
      .select('order')
      .eq('course_id', courseId)
      .order('order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastOrder?.order ?? -1) + 1;

    // Crear la vinculación
    const { data: courseTest, error } = await supabaseAdmin
      .from('course_tests')
      .insert({
        test_id: testId,
        course_id: courseId,
        created_by: createdBy,
        is_required: isRequired ?? true,
        available_from: availableFrom || null,
        available_until: availableUntil || null,
        order: nextOrder,
      })
      .select(`
        *,
        test:tests(id, title, description, status)
      `)
      .single();

    if (error) {
      console.error('Error creating course test:', error);
      return NextResponse.json(
        { error: 'Error al vincular el test al curso' },
        { status: 500 }
      );
    }

    // Transformar respuesta
    const transformedCourseTest = {
      id: courseTest.id,
      testId: courseTest.test_id,
      courseId: courseTest.course_id,
      isRequired: courseTest.is_required,
      availableFrom: courseTest.available_from,
      availableUntil: courseTest.available_until,
      order: courseTest.order,
      createdBy: courseTest.created_by,
      createdAt: courseTest.created_at,
      updatedAt: courseTest.updated_at,
      test: courseTest.test ? {
        id: courseTest.test.id,
        title: courseTest.test.title,
        description: courseTest.test.description,
        status: courseTest.test.status,
      } : undefined,
    };

    return NextResponse.json({ courseTest: transformedCourseTest }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/course-tests:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/course-tests
 * Elimina una vinculación de test a curso
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseTestId = searchParams.get('id');
    const courseId = searchParams.get('courseId');
    const testId = searchParams.get('testId');

    // Eliminar por ID específico o por combinación course+test
    if (courseTestId) {
      const { error } = await supabaseAdmin
        .from('course_tests')
        .delete()
        .eq('id', courseTestId);

      if (error) {
        console.error('Error deleting course test:', error);
        return NextResponse.json(
          { error: 'Error al desvincular el test' },
          { status: 500 }
        );
      }
    } else if (courseId && testId) {
      const { error } = await supabaseAdmin
        .from('course_tests')
        .delete()
        .eq('course_id', courseId)
        .eq('test_id', testId);

      if (error) {
        console.error('Error deleting course test:', error);
        return NextResponse.json(
          { error: 'Error al desvincular el test' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Se requiere el ID del course_test o courseId+testId' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/course-tests:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

