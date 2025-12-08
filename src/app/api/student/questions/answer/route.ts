import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

/**
 * POST /api/student/questions/answer - Responder a una pregunta
 * Body: { userId, questionId, answerText }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { userId, questionId, answerText } = body;

    if (!userId || !questionId || !answerText) {
      return NextResponse.json(
        { error: 'userId, questionId y answerText son requeridos' },
        { status: 400 }
      );
    }

    // Obtener información del usuario
    const { data: user, error: userError } = await supabase
      .from(TABLES.USERS)
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'No se encontró el usuario' },
        { status: 404 }
      );
    }

    // Verificar si es instructor del curso
    const { data: question, error: questionError } = await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .select(`
        id,
        course_id,
        course:courses!lesson_questions_course_id_fkey (
          teacher_ids
        )
      `)
      .eq('id', questionId)
      .maybeSingle();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'No se encontró la pregunta' },
        { status: 404 }
      );
    }

    // Verificar si es instructor (course puede ser objeto o array)
    const courseData = Array.isArray(question.course) 
      ? question.course[0] 
      : question.course;
    const teacherIds = courseData?.teacher_ids || [];
    const isInstructor = 
      user.role === 'teacher' && 
      teacherIds.includes(userId);

    // Crear la respuesta
    const { data: answer, error: answerError } = await supabase
      .from(TABLES.LESSON_QUESTION_ANSWERS)
      .insert({
        question_id: questionId,
        user_id: userId,
        user_role: user.role,
        answer_text: answerText.trim(),
        is_instructor_answer: isInstructor,
      })
      .select()
      .single();

    if (answerError) {
      console.error('[questions/answer API] Error creating answer:', answerError);
      return NextResponse.json(
        { error: answerError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer }, { status: 201 });
  } catch (e: any) {
    console.error('[questions/answer API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/student/questions/answer - Marcar respuesta como aceptada
 * Body: { userId, answerId, questionId }
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { userId, answerId, questionId } = body;

    if (!userId || !answerId || !questionId) {
      return NextResponse.json(
        { error: 'userId, answerId y questionId son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario es el autor de la pregunta
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    const { data: question, error: questionError } = await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .select('id, student_id')
      .eq('id', questionId)
      .maybeSingle();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'No se encontró la pregunta' },
        { status: 404 }
      );
    }

    if (question.student_id !== student.id) {
      return NextResponse.json(
        { error: 'Solo el autor de la pregunta puede aceptar respuestas' },
        { status: 403 }
      );
    }

    // Desmarcar otras respuestas aceptadas de esta pregunta
    await supabase
      .from(TABLES.LESSON_QUESTION_ANSWERS)
      .update({ is_accepted: false })
      .eq('question_id', questionId);

    // Marcar la respuesta como aceptada
    const { data: answer, error: updateError } = await supabase
      .from(TABLES.LESSON_QUESTION_ANSWERS)
      .update({ is_accepted: true })
      .eq('id', answerId)
      .select()
      .single();

    if (updateError) {
      console.error('[questions/answer API] Error updating answer:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Marcar la pregunta como resuelta
    await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .update({ is_resolved: true })
      .eq('id', questionId);

    return NextResponse.json({ answer, resolved: true }, { status: 200 });
  } catch (e: any) {
    console.error('[questions/answer API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}
