import { NextRequest, NextResponse } from 'next/server';
import { CreateQuestionDTO } from '@/types/test';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { teacherHasViewAccessToTest, teacherIsTestCreator } from '@/lib/auth/testPermissions';

/**
 * GET /api/admin/tests/[id]/questions
 * Lista todas las preguntas de un test
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

    // Verificar que el test existe
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('id')
      .eq('id', id)
      .single();

    if (testError || !test) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    // Obtener preguntas
    const { data: questions, error } = await supabaseAdmin
      .from('test_questions')
      .select('*')
      .eq('test_id', id)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching questions:', error);
      return NextResponse.json(
        { error: 'Error al obtener las preguntas' },
        { status: 500 }
      );
    }

    // Transformar datos
    const transformedQuestions = (questions || []).map(q => ({
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
    }));

    return NextResponse.json({ questions: transformedQuestions });
  } catch (error) {
    console.error('Error in GET /api/admin/tests/[id]/questions:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tests/[id]/questions
 * Crea una nueva pregunta para un test
 */
export async function POST(
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
    const body: CreateQuestionDTO = await request.json();

    // Validar datos requeridos
    if (!body.questionType || !body.questionText) {
      return NextResponse.json(
        { error: 'El tipo de pregunta y el texto son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el test existe
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('id')
      .eq('id', id)
      .single();

    if (testError || !test) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    // Obtener el orden máximo actual
    const { data: lastQuestion } = await supabaseAdmin
      .from('test_questions')
      .select('order')
      .eq('test_id', id)
      .order('order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = body.order ?? ((lastQuestion?.order ?? -1) + 1);

    // Preparar datos para inserción
    const questionData = {
      test_id: id,
      question_type: body.questionType,
      question_text: body.questionText,
      question_media_url: body.questionMediaUrl || null,
      options: body.options || [],
      correct_answer: body.correctAnswer || null,
      explanation: body.explanation || null,
      points: body.points ?? 1,
      time_limit_seconds: body.timeLimitSeconds || null,
      order: nextOrder,
      is_required: body.isRequired ?? true,
    };

    const { data: question, error } = await supabaseAdmin
      .from('test_questions')
      .insert(questionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating question:', error);
      return NextResponse.json(
        { error: 'Error al crear la pregunta' },
        { status: 500 }
      );
    }

    // Transformar respuesta
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

    return NextResponse.json({ question: transformedQuestion }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/tests/[id]/questions:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

