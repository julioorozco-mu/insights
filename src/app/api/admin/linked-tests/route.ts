import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LinkTestDTO } from '@/types/test';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/linked-tests
 * Lista todas las vinculaciones de tests
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testId = searchParams.get('testId');
    const lessonId = searchParams.get('lessonId');
    const courseId = searchParams.get('courseId');
    const sectionId = searchParams.get('sectionId');

    let query = supabaseAdmin
      .from('linked_tests')
      .select(`
        *,
        test:tests(id, title, status, time_mode, time_limit_minutes),
        lesson:lessons(id, title),
        section:course_sections(id, title),
        course:courses(id, title)
      `)
      .order('created_at', { ascending: false });

    if (testId) query = query.eq('test_id', testId);
    if (lessonId) query = query.eq('lesson_id', lessonId);
    if (courseId) query = query.eq('course_id', courseId);
    if (sectionId) query = query.eq('section_id', sectionId);

    const { data: linkedTests, error } = await query;

    if (error) {
      console.error('Error fetching linked tests:', error);
      return NextResponse.json(
        { error: 'Error al obtener las vinculaciones' },
        { status: 500 }
      );
    }

    // Transformar datos
    const transformedLinkedTests = (linkedTests || []).map(lt => ({
      id: lt.id,
      testId: lt.test_id,
      lessonId: lt.lesson_id,
      sectionId: lt.section_id,
      courseId: lt.course_id,
      isRequired: lt.is_required,
      availableFrom: lt.available_from,
      availableUntil: lt.available_until,
      order: lt.order,
      createdBy: lt.created_by,
      createdAt: lt.created_at,
      updatedAt: lt.updated_at,
      test: lt.test ? {
        id: lt.test.id,
        title: lt.test.title,
        status: lt.test.status,
        timeMode: lt.test.time_mode,
        timeLimitMinutes: lt.test.time_limit_minutes,
      } : undefined,
      lesson: lt.lesson ? {
        id: lt.lesson.id,
        title: lt.lesson.title,
      } : undefined,
      section: lt.section ? {
        id: lt.section.id,
        title: lt.section.title,
      } : undefined,
      course: lt.course ? {
        id: lt.course.id,
        title: lt.course.title,
      } : undefined,
    }));

    return NextResponse.json({ linkedTests: transformedLinkedTests });
  } catch (error) {
    console.error('Error in GET /api/admin/linked-tests:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/linked-tests
 * Vincula un test a una lección/sección/curso
 */
export async function POST(request: NextRequest) {
  try {
    const body: LinkTestDTO & { createdBy: string } = await request.json();

    // Validar datos requeridos
    if (!body.testId || !body.createdBy) {
      return NextResponse.json(
        { error: 'Se requiere el ID del test y del creador' },
        { status: 400 }
      );
    }

    if (!body.lessonId && !body.sectionId && !body.courseId) {
      return NextResponse.json(
        { error: 'Se requiere vincular a una lección, sección o curso' },
        { status: 400 }
      );
    }

    // Verificar que el test existe
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('id, status')
      .eq('id', body.testId)
      .single();

    if (testError || !test) {
      return NextResponse.json(
        { error: 'Test no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si ya existe una vinculación similar
    let existingQuery = supabaseAdmin
      .from('linked_tests')
      .select('id')
      .eq('test_id', body.testId);

    if (body.lessonId) existingQuery = existingQuery.eq('lesson_id', body.lessonId);
    if (body.sectionId) existingQuery = existingQuery.eq('section_id', body.sectionId);
    if (body.courseId) existingQuery = existingQuery.eq('course_id', body.courseId);

    const { data: existing } = await existingQuery.single();

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una vinculación similar' },
        { status: 409 }
      );
    }

    // Obtener el orden máximo actual
    let orderQuery = supabaseAdmin
      .from('linked_tests')
      .select('order')
      .order('order', { ascending: false })
      .limit(1);

    if (body.lessonId) orderQuery = orderQuery.eq('lesson_id', body.lessonId);
    else if (body.sectionId) orderQuery = orderQuery.eq('section_id', body.sectionId);
    else if (body.courseId) orderQuery = orderQuery.eq('course_id', body.courseId);

    const { data: lastOrder } = await orderQuery.single();
    const nextOrder = body.order ?? ((lastOrder?.order ?? -1) + 1);

    // Crear vinculación
    const linkedTestData = {
      test_id: body.testId,
      lesson_id: body.lessonId || null,
      section_id: body.sectionId || null,
      course_id: body.courseId || null,
      is_required: body.isRequired ?? false,
      available_from: body.availableFrom || null,
      available_until: body.availableUntil || null,
      order: nextOrder,
      created_by: body.createdBy,
    };

    const { data: linkedTest, error } = await supabaseAdmin
      .from('linked_tests')
      .insert(linkedTestData)
      .select(`
        *,
        test:tests(id, title, status)
      `)
      .single();

    if (error) {
      console.error('Error creating linked test:', error);
      return NextResponse.json(
        { error: 'Error al crear la vinculación' },
        { status: 500 }
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
      } : undefined,
    };

    return NextResponse.json({ linkedTest: transformedLinkedTest }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/linked-tests:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

