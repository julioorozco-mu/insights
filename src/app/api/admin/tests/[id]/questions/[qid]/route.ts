import { NextRequest, NextResponse } from 'next/server';
import { UpdateQuestionDTO } from '@/types/test';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { teacherHasViewAccessToTest, teacherIsTestCreator } from '@/lib/auth/testPermissions';

/**
 * GET /api/admin/tests/[id]/questions/[qid]
 * Obtiene una pregunta específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  try {
    const { id, qid } = await params;

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

    const { data: question, error } = await supabaseAdmin
      .from('test_questions')
      .select('*')
      .eq('id', qid)
      .eq('test_id', id)
      .single();

    if (error || !question) {
      return NextResponse.json(
        { error: 'Pregunta no encontrada' },
        { status: 404 }
      );
    }

    const transformedQuestion = {
      id: question.id,
      testId: question.test_id,
      questionType: question.question_type,
      questionText: question.question_text,
      questionMediaUrl: question.question_media_url,
      options: question.options,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      points: question.points,
      timeLimitSeconds: question.time_limit_seconds,
      order: question.order,
      isRequired: question.is_required,
      createdAt: question.created_at,
      updatedAt: question.updated_at,
    };

    return NextResponse.json({ question: transformedQuestion });
  } catch (error) {
    console.error('Error in GET /api/admin/tests/[id]/questions/[qid]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/tests/[id]/questions/[qid]
 * Actualiza una pregunta
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  try {
    const { id, qid } = await params;

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
    const body: UpdateQuestionDTO = await request.json();

    // Verificar que la pregunta existe
    const { data: existingQuestion, error: findError } = await supabaseAdmin
      .from('test_questions')
      .select('id')
      .eq('id', qid)
      .eq('test_id', id)
      .single();

    if (findError || !existingQuestion) {
      return NextResponse.json(
        { error: 'Pregunta no encontrada' },
        { status: 404 }
      );
    }

    // Preparar datos para actualización
    const updateData: Record<string, unknown> = {};

    if (body.questionType !== undefined) updateData.question_type = body.questionType;
    if (body.questionText !== undefined) updateData.question_text = body.questionText;
    if (body.questionMediaUrl !== undefined) updateData.question_media_url = body.questionMediaUrl;
    if (body.options !== undefined) updateData.options = body.options;
    if (body.correctAnswer !== undefined) updateData.correct_answer = body.correctAnswer;
    if (body.explanation !== undefined) updateData.explanation = body.explanation;
    if (body.points !== undefined) updateData.points = body.points;
    if (body.timeLimitSeconds !== undefined) updateData.time_limit_seconds = body.timeLimitSeconds;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.isRequired !== undefined) updateData.is_required = body.isRequired;

    const { data: question, error } = await supabaseAdmin
      .from('test_questions')
      .update(updateData)
      .eq('id', qid)
      .select()
      .single();

    if (error) {
      console.error('Error updating question:', error);
      return NextResponse.json(
        { error: 'Error al actualizar la pregunta' },
        { status: 500 }
      );
    }

    const transformedQuestion = {
      id: question.id,
      testId: question.test_id,
      questionType: question.question_type,
      questionText: question.question_text,
      questionMediaUrl: question.question_media_url,
      options: question.options,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      points: question.points,
      timeLimitSeconds: question.time_limit_seconds,
      order: question.order,
      isRequired: question.is_required,
      createdAt: question.created_at,
      updatedAt: question.updated_at,
    };

    return NextResponse.json({ question: transformedQuestion });
  } catch (error) {
    console.error('Error in PUT /api/admin/tests/[id]/questions/[qid]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tests/[id]/questions/[qid]
 * Elimina una pregunta
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  try {
    const { id, qid } = await params;

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

    // Verificar que la pregunta existe
    const { data: existingQuestion, error: findError } = await supabaseAdmin
      .from('test_questions')
      .select('id, order')
      .eq('id', qid)
      .eq('test_id', id)
      .single();

    if (findError || !existingQuestion) {
      return NextResponse.json(
        { error: 'Pregunta no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar pregunta
    const { error } = await supabaseAdmin
      .from('test_questions')
      .delete()
      .eq('id', qid);

    if (error) {
      console.error('Error deleting question:', error);
      return NextResponse.json(
        { error: 'Error al eliminar la pregunta' },
        { status: 500 }
      );
    }

    // Reordenar preguntas restantes
    try {
      await supabaseAdmin.rpc('reorder_questions_after_delete', {
        p_test_id: id,
        p_deleted_order: existingQuestion.order,
      });
    } catch {
      // Si la función RPC no existe, reordenar manualmente
      // Esto es un fallback por si la función no existe
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/tests/[id]/questions/[qid]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

