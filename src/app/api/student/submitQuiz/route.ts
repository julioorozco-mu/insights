import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';

// Grade answers server-side by comparing with survey questions
function gradeQuiz(
  questions: any[],
  studentAnswers: { questionId: string; answer: string | string[] }[]
): { score: number; totalQuestions: number; percentage: number } {
  const totalQuestions = questions.length;
  if (totalQuestions === 0) return { score: 0, totalQuestions: 0, percentage: 0 };

  let correctCount = 0;
  const answersMap = new Map(studentAnswers.map((a) => [a.questionId, a.answer]));

  for (const q of questions) {
    const userAnswer = answersMap.get(q.id);
    if (userAnswer === undefined || userAnswer === '') continue;

    // Check using isCorrect on options
    if (q.options && q.options.some((o: any) => o.isCorrect)) {
      const correctOptions = q.options
        .filter((o: any) => o.isCorrect)
        .map((o: any) => o.value);

      if (q.type === 'multiple_choice') {
        const userArr = Array.isArray(userAnswer) ? userAnswer : [];
        if (
          correctOptions.length === userArr.length &&
          correctOptions.every((c: string) => userArr.includes(c))
        ) {
          correctCount++;
        }
      } else {
        if (correctOptions.includes(userAnswer as string)) {
          correctCount++;
        }
      }
    } else if (q.correctAnswer) {
      if (Array.isArray(q.correctAnswer)) {
        if (
          Array.isArray(userAnswer) &&
          userAnswer.length === q.correctAnswer.length &&
          userAnswer.every((a: string) => q.correctAnswer.includes(a))
        ) {
          correctCount++;
        }
      } else if (userAnswer === q.correctAnswer) {
        correctCount++;
      }
    }
  }

  const percentage =
    totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 10000) / 100
      : 0;

  return { score: correctCount, totalQuestions, percentage };
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getApiAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (authUser.role !== 'student') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { surveyId, courseId, lessonId, answers } = body;

    if (!surveyId || !courseId || !answers) {
      return NextResponse.json(
        { error: 'surveyId, courseId y answers son requeridos' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Obtener registro de estudiante
    const { data: student, error: studentError } = await supabaseAdmin
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // Fetch survey questions + check existing response in parallel
    const [existingCheck, surveyResult, userResult] = await Promise.all([
      supabaseAdmin
        .from(TABLES.SURVEY_RESPONSES)
        .select('id')
        .eq('survey_id', surveyId)
        .eq('user_id', authUser.id)
        .maybeSingle(),
      supabaseAdmin
        .from(TABLES.SURVEYS)
        .select('questions')
        .eq('id', surveyId)
        .single(),
      supabaseAdmin
        .from(TABLES.USERS)
        .select('name')
        .eq('id', authUser.id)
        .maybeSingle(),
    ]);

    if (existingCheck.error && existingCheck.error.code !== 'PGRST116') {
      console.error('[submitQuiz API] Error checking existing response:', existingCheck.error);
      return NextResponse.json(
        { error: 'Error al verificar respuesta existente' },
        { status: 500 }
      );
    }

    if (userResult.error || !userResult.data) {
      return NextResponse.json(
        { error: 'Error al obtener información del usuario' },
        { status: 500 }
      );
    }

    // Grade the quiz server-side
    const surveyQuestions = surveyResult.data?.questions || [];
    const { score, totalQuestions, percentage } = gradeQuiz(
      Array.isArray(surveyQuestions) ? surveyQuestions : [],
      answers
    );

    // Preparar datos de respuesta
    const responseData: any = {
      survey_id: surveyId,
      user_id: authUser.id,
      user_name: userResult.data.name || 'Usuario',
      course_id: courseId,
      lesson_id: lessonId || null,
      answers: answers,
      submitted_at: new Date().toISOString(),
      score,
      total_questions: totalQuestions,
      percentage,
    };

    let responseId: string;

    if (existingCheck.data) {
      // Actualizar respuesta existente
      const { data: updatedResponse, error: updateError } = await supabaseAdmin
        .from(TABLES.SURVEY_RESPONSES)
        .update({
          answers: responseData.answers,
          submitted_at: responseData.submitted_at,
          score,
          total_questions: totalQuestions,
          percentage,
        })
        .eq('id', existingCheck.data.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('[submitQuiz API] Error updating response:', updateError);
        return NextResponse.json(
          { error: 'Error al actualizar la respuesta' },
          { status: 500 }
        );
      }

      responseId = updatedResponse.id;
    } else {
      // Crear nueva respuesta
      const { data: newResponse, error: insertError } = await supabaseAdmin
        .from(TABLES.SURVEY_RESPONSES)
        .insert(responseData)
        .select('id')
        .single();

      if (insertError) {
        console.error('[submitQuiz API] Error inserting response:', insertError);
        return NextResponse.json(
          { error: 'Error al guardar la respuesta' },
          { status: 500 }
        );
      }

      responseId = newResponse.id;
    }

    return NextResponse.json({
      success: true,
      responseId,
      score,
      totalQuestions,
      percentage,
      message: existingCheck.data ? 'Respuesta actualizada' : 'Respuesta guardada',
    });
  } catch (e: any) {
    console.error('[submitQuiz API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}
