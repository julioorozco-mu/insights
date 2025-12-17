import { NextRequest, NextResponse } from 'next/server';
import { UpdateTestDTO } from '@/types/test';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { teacherHasViewAccessToTest, teacherIsTestCreator } from '@/lib/auth/testPermissions';

/**
 * GET /api/admin/tests/[id]
 * Obtiene un test por ID con sus preguntas
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authUser = await getApiAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const isAdmin =
      authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

    if (!isAdmin) {
      if (authUser.role !== 'teacher') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const allowed = await teacherHasViewAccessToTest(authUser.id, id);
      if (!allowed) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Obtener test
    const { data: test, error } = await supabaseAdmin
      .from('tests')
      .select(`
        *,
        creator:users!tests_created_by_fkey(id, name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error || !test) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    // Obtener preguntas
    const { data: questions } = await supabaseAdmin
      .from('test_questions')
      .select('*')
      .eq('test_id', id)
      .order('order', { ascending: true });

    // Transformar datos
    const transformedTest = {
      id: test.id,
      title: test.title,
      description: test.description,
      instructions: test.instructions,
      coverImageUrl: test.cover_image_url,
      status: test.status,
      timeMode: test.time_mode,
      timeLimitMinutes: test.time_limit_minutes,
      passingScore: test.passing_score,
      maxAttempts: test.max_attempts,
      shuffleQuestions: test.shuffle_questions,
      shuffleOptions: test.shuffle_options,
      showResultsImmediately: test.show_results_immediately,
      showCorrectAnswers: test.show_correct_answers,
      allowReview: test.allow_review,
      createdBy: test.created_by,
      isActive: test.is_active,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
      creator: test.creator ? {
        id: test.creator.id,
        name: test.creator.name,
        avatarUrl: test.creator.avatar_url,
      } : undefined,
      questions: (questions || []).map(q => ({
        id: q.id,
        testId: q.test_id,
        questionType: q.question_type,
        questionText: q.question_text,
        questionMediaUrl: q.question_media_url,
        options: q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        points: q.points,
        timeLimitSeconds: q.time_limit_seconds,
        order: q.order,
        isRequired: q.is_required,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      })),
    };

    return NextResponse.json({ test: transformedTest });
  } catch (error) {
    console.error('Error in GET /api/admin/tests/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/tests/[id]
 * Actualiza un test
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateTestDTO = await request.json();

    const authUser = await getApiAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const isAdmin =
      authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

    if (!isAdmin) {
      if (authUser.role !== 'teacher') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const isCreator = await teacherIsTestCreator(authUser.id, id);
      if (!isCreator) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verificar que el test existe
    const { data: existingTest, error: findError } = await supabaseAdmin
      .from('tests')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !existingTest) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    // Preparar datos para actualización
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.instructions !== undefined) updateData.instructions = body.instructions;
    if (body.coverImageUrl !== undefined) updateData.cover_image_url = body.coverImageUrl;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.timeMode !== undefined) updateData.time_mode = body.timeMode;
    if (body.timeLimitMinutes !== undefined) updateData.time_limit_minutes = body.timeLimitMinutes;
    if (body.passingScore !== undefined) updateData.passing_score = body.passingScore;
    if (body.maxAttempts !== undefined) updateData.max_attempts = body.maxAttempts;
    if (body.shuffleQuestions !== undefined) updateData.shuffle_questions = body.shuffleQuestions;
    if (body.shuffleOptions !== undefined) updateData.shuffle_options = body.shuffleOptions;
    if (body.showResultsImmediately !== undefined) updateData.show_results_immediately = body.showResultsImmediately;
    if (body.showCorrectAnswers !== undefined) updateData.show_correct_answers = body.showCorrectAnswers;
    if (body.allowReview !== undefined) updateData.allow_review = body.allowReview;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    const { data: test, error } = await supabaseAdmin
      .from('tests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating test:', error);
      return NextResponse.json(
        { error: 'Error al actualizar la evaluación' },
        { status: 500 }
      );
    }

    // Transformar respuesta
    const transformedTest = {
      id: test.id,
      title: test.title,
      description: test.description,
      instructions: test.instructions,
      coverImageUrl: test.cover_image_url,
      status: test.status,
      timeMode: test.time_mode,
      timeLimitMinutes: test.time_limit_minutes,
      passingScore: test.passing_score,
      maxAttempts: test.max_attempts,
      shuffleQuestions: test.shuffle_questions,
      shuffleOptions: test.shuffle_options,
      showResultsImmediately: test.show_results_immediately,
      showCorrectAnswers: test.show_correct_answers,
      allowReview: test.allow_review,
      createdBy: test.created_by,
      isActive: test.is_active,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
    };

    return NextResponse.json({ test: transformedTest });
  } catch (error) {
    console.error('Error in PUT /api/admin/tests/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tests/[id]
 * Elimina un test (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authUser = await getApiAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const isAdmin =
      authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

    if (!isAdmin) {
      if (authUser.role !== 'teacher') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const isCreator = await teacherIsTestCreator(authUser.id, id);
      if (!isCreator) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verificar que el test existe
    const { data: existingTest, error: findError } = await supabaseAdmin
      .from('tests')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !existingTest) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    // Soft delete: marcar como inactivo
    const { error } = await supabaseAdmin
      .from('tests')
      .update({ is_active: false, status: 'archived' })
      .eq('id', id);

    if (error) {
      console.error('Error deleting test:', error);
      return NextResponse.json(
        { error: 'Error al eliminar la evaluación' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/tests/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

