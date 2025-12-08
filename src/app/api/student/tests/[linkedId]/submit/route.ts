import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAnswer } from '@/types/test';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/student/tests/[linkedId]/submit
 * Finaliza y califica el test
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkedId: string }> }
) {
  try {
    const { linkedId } = await params;
    const body = await request.json();
    const { studentId, answers } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del estudiante' },
        { status: 400 }
      );
    }

    // Obtener el intento en progreso
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('completed_tests')
      .select('*')
      .eq('linked_test_id', linkedId)
      .eq('student_id', studentId)
      .eq('status', 'in_progress')
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: 'No se encontró un intento en progreso' },
        { status: 404 }
      );
    }

    // Obtener el test y sus preguntas
    const { data: test } = await supabaseAdmin
      .from('tests')
      .select('*')
      .eq('id', attempt.test_id)
      .single();

    const { data: questions } = await supabaseAdmin
      .from('test_questions')
      .select('*')
      .eq('test_id', attempt.test_id);

    if (!test || !questions) {
      return NextResponse.json(
        { error: 'Error al obtener la evaluación' },
        { status: 500 }
      );
    }

    // Guardar o actualizar respuestas
    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    const answersReview: any[] = [];

    for (const question of questions) {
      maxScore += question.points;
      
      const studentAnswer = answers?.find((a: any) => a.questionId === question.id);
      const isCorrect = studentAnswer 
        ? checkAnswer(question.question_type, studentAnswer.answer, question.correct_answer)
        : false;
      
      const pointsEarned = isCorrect ? question.points : 0;
      totalScore += pointsEarned;

      if (studentAnswer) {
        if (isCorrect) correctCount++;
        else incorrectCount++;
      }

      // Guardar respuesta
      if (studentAnswer) {
        // Verificar si ya existe
        const { data: existingAnswer } = await supabaseAdmin
          .from('test_answers')
          .select('id')
          .eq('completed_test_id', attempt.id)
          .eq('question_id', question.id)
          .single();

        if (existingAnswer) {
          await supabaseAdmin
            .from('test_answers')
            .update({
              answer: studentAnswer.answer,
              is_correct: isCorrect,
              points_earned: pointsEarned,
              time_spent_seconds: studentAnswer.timeSpentSeconds,
              answered_at: new Date().toISOString(),
            })
            .eq('id', existingAnswer.id);
        } else {
          await supabaseAdmin
            .from('test_answers')
            .insert({
              completed_test_id: attempt.id,
              question_id: question.id,
              student_id: studentId,
              answer: studentAnswer.answer,
              is_correct: isCorrect,
              points_earned: pointsEarned,
              time_spent_seconds: studentAnswer.timeSpentSeconds,
            });
        }
      }

      // Preparar revisión de respuestas
      if (test.show_correct_answers) {
        answersReview.push({
          questionId: question.id,
          questionText: question.question_text,
          questionType: question.question_type,
          options: question.options,
          studentAnswer: studentAnswer?.answer || null,
          correctAnswer: question.correct_answer,
          isCorrect,
          pointsEarned,
          explanation: question.explanation,
        });
      }
    }

    // Calcular resultados
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = percentage >= (test.passing_score || 60);
    const endTime = new Date();
    const startTime = new Date(attempt.start_time);
    const timeSpentSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    // Actualizar intento
    const { data: updatedAttempt, error: updateError } = await supabaseAdmin
      .from('completed_tests')
      .update({
        status: 'completed',
        score: totalScore,
        max_score: maxScore,
        percentage: Math.round(percentage * 100) / 100,
        passed,
        end_time: endTime.toISOString(),
        time_spent_seconds: timeSpentSeconds,
      })
      .eq('id', attempt.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating attempt:', updateError);
      return NextResponse.json(
        { error: 'Error al finalizar la evaluación' },
        { status: 500 }
      );
    }

    const response: any = {
      attempt: {
        id: updatedAttempt.id,
        linkedTestId: updatedAttempt.linked_test_id,
        testId: updatedAttempt.test_id,
        studentId: updatedAttempt.student_id,
        attemptNumber: updatedAttempt.attempt_number,
        status: updatedAttempt.status,
        score: updatedAttempt.score,
        maxScore: updatedAttempt.max_score,
        percentage: updatedAttempt.percentage,
        passed: updatedAttempt.passed,
        startTime: updatedAttempt.start_time,
        endTime: updatedAttempt.end_time,
        timeSpentSeconds: updatedAttempt.time_spent_seconds,
      },
      results: {
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        unanswered: questions.length - correctCount - incorrectCount,
        score: totalScore,
        maxScore,
        percentage: Math.round(percentage * 100) / 100,
        passed,
        timeSpent: timeSpentSeconds,
      },
    };

    // Incluir respuestas si está configurado
    if (test.show_results_immediately && test.show_correct_answers) {
      response.answersReview = answersReview;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in POST /api/student/tests/[linkedId]/submit:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

