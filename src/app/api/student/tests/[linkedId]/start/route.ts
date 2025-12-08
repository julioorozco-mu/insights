import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/student/tests/[linkedId]/start
 * Inicia un nuevo intento de test para el estudiante
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkedId: string }> }
) {
  try {
    const { linkedId } = await params;
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del estudiante' },
        { status: 400 }
      );
    }

    // Obtener linked_test con información del test
    const { data: linkedTest, error: linkedError } = await supabaseAdmin
      .from('linked_tests')
      .select(`
        *,
        test:tests(*)
      `)
      .eq('id', linkedId)
      .single();

    if (linkedError || !linkedTest) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    const test = linkedTest.test;

    // Verificar disponibilidad
    const now = new Date();
    if (linkedTest.available_from && new Date(linkedTest.available_from) > now) {
      return NextResponse.json(
        { error: 'La evaluación aún no está disponible' },
        { status: 403 }
      );
    }
    if (linkedTest.available_until && new Date(linkedTest.available_until) < now) {
      return NextResponse.json(
        { error: 'La evaluación ya no está disponible' },
        { status: 403 }
      );
    }

    // Verificar si ya hay un intento en progreso
    const { data: existingAttempt } = await supabaseAdmin
      .from('completed_tests')
      .select('*')
      .eq('linked_test_id', linkedId)
      .eq('student_id', studentId)
      .eq('status', 'in_progress')
      .single();

    if (existingAttempt) {
      // Retornar el intento existente
      const { data: questions } = await supabaseAdmin
        .from('test_questions')
        .select('*')
        .eq('test_id', test.id)
        .order('order', { ascending: true });

      // Obtener respuestas guardadas
      const { data: savedAnswers } = await supabaseAdmin
        .from('test_answers')
        .select('*')
        .eq('completed_test_id', existingAttempt.id);

      return NextResponse.json({
        attempt: transformCompletedTest(existingAttempt),
        test: {
          ...transformTest(test),
          questions: (questions || []).map(transformQuestion),
        },
        savedAnswers: (savedAnswers || []).map(transformAnswer),
        remainingTime: calculateRemainingTime(existingAttempt, test),
      });
    }

    // Verificar número de intentos
    const { count: attemptCount } = await supabaseAdmin
      .from('completed_tests')
      .select('*', { count: 'exact', head: true })
      .eq('linked_test_id', linkedId)
      .eq('student_id', studentId);

    if (attemptCount && attemptCount >= test.max_attempts) {
      return NextResponse.json(
        { error: `Has alcanzado el máximo de ${test.max_attempts} intento(s)` },
        { status: 403 }
      );
    }

    // Crear nuevo intento
    const { data: newAttempt, error: createError } = await supabaseAdmin
      .from('completed_tests')
      .insert({
        linked_test_id: linkedId,
        test_id: test.id,
        student_id: studentId,
        attempt_number: (attemptCount || 0) + 1,
        status: 'in_progress',
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating attempt:', createError);
      return NextResponse.json(
        { error: 'Error al iniciar la evaluación' },
        { status: 500 }
      );
    }

    // Obtener preguntas (posiblemente mezcladas)
    let questionsQuery = supabaseAdmin
      .from('test_questions')
      .select('*')
      .eq('test_id', test.id);

    if (test.shuffle_questions) {
      questionsQuery = questionsQuery.order('random()');
    } else {
      questionsQuery = questionsQuery.order('order', { ascending: true });
    }

    const { data: questions } = await questionsQuery;

    return NextResponse.json({
      attempt: transformCompletedTest(newAttempt),
      test: {
        ...transformTest(test),
        questions: (questions || []).map(transformQuestion),
      },
      savedAnswers: [],
      remainingTime: test.time_mode === 'timed' ? (test.time_limit_minutes || 30) * 60 : null,
    });
  } catch (error) {
    console.error('Error in POST /api/student/tests/[linkedId]/start:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Helpers para transformar datos
function transformTest(test: any) {
  return {
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
  };
}

function transformQuestion(q: any) {
  return {
    id: q.id,
    testId: q.test_id,
    questionType: q.question_type,
    questionText: q.question_text,
    questionMediaUrl: q.question_media_url,
    options: q.options,
    // NO incluir correctAnswer para estudiantes durante el test
    explanation: null,
    points: q.points,
    timeLimitSeconds: q.time_limit_seconds,
    order: q.order,
    isRequired: q.is_required,
  };
}

function transformCompletedTest(ct: any) {
  return {
    id: ct.id,
    linkedTestId: ct.linked_test_id,
    testId: ct.test_id,
    studentId: ct.student_id,
    attemptNumber: ct.attempt_number,
    status: ct.status,
    score: ct.score,
    maxScore: ct.max_score,
    percentage: ct.percentage,
    passed: ct.passed,
    startTime: ct.start_time,
    endTime: ct.end_time,
    timeSpentSeconds: ct.time_spent_seconds,
  };
}

function transformAnswer(a: any) {
  return {
    id: a.id,
    completedTestId: a.completed_test_id,
    questionId: a.question_id,
    answer: a.answer,
    answeredAt: a.answered_at,
  };
}

function calculateRemainingTime(attempt: any, test: any): number | null {
  if (test.time_mode !== 'timed') return null;
  
  const startTime = new Date(attempt.start_time).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - startTime) / 1000);
  const totalTime = (test.time_limit_minutes || 30) * 60;
  
  return Math.max(0, totalTime - elapsed);
}

