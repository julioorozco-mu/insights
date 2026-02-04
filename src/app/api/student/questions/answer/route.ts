import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TABLES } from '@/utils/constants';
import {
  createAnswerSchema,
  acceptAnswerSchema,
  parseRequestBody,
} from '@/lib/validators/lessonContentSchema';
import {
  rateLimitMiddleware,
  RATE_LIMITS,
} from '@/lib/auth/serverRateLimiter';

/**
 * POST /api/student/questions/answer - Responder a una pregunta
 * Body: { questionId, answerText }
 *
 * SEGURIDAD:
 * - Autenticación requerida via session (NO confía en userId del cliente)
 * - Rate limiting estricto para creación de contenido
 * - Validación y sanitización con Zod
 * - Verificación de permisos (instructor del curso)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticación PRIMERO
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Rate limiting por usuario autenticado
    const rateLimitResponse = rateLimitMiddleware(
      req,
      RATE_LIMITS.CONTENT_CREATE,
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Validar body con Zod
    const parseResult = await parseRequestBody(req, createAnswerSchema);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const { answer_text } = parseResult.data;

    // 4. Obtener questionId de query params o body
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId') || parseResult.data.question_id;

    if (!questionId) {
      return NextResponse.json(
        { error: 'questionId es requerido' },
        { status: 400 }
      );
    }

    // 5. Obtener información del usuario desde la DB
    const { data: dbUser, error: userError } = await supabase
      .from(TABLES.USERS)
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !dbUser) {
      return NextResponse.json(
        { error: 'No se encontró el usuario' },
        { status: 404 }
      );
    }

    // 6. Verificar que la pregunta existe y obtener info del curso
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

    // 7. Verificar si es instructor del curso
    const courseData = Array.isArray(question.course)
      ? question.course[0]
      : question.course;
    const teacherIds = courseData?.teacher_ids || [];
    const isInstructor =
      dbUser.role === 'teacher' &&
      teacherIds.includes(user.id);

    // 8. Crear la respuesta
    const { data: answer, error: answerError } = await supabase
      .from(TABLES.LESSON_QUESTION_ANSWERS)
      .insert({
        question_id: questionId,
        user_id: user.id,
        user_role: dbUser.role,
        answer_text: answer_text, // Ya sanitizado por Zod
        is_instructor_answer: isInstructor,
      })
      .select(`
        id,
        answer_text,
        is_instructor_answer,
        is_accepted,
        upvotes,
        created_at
      `)
      .single();

    if (answerError) {
      console.error('[questions/answer API] Error creating answer:', answerError);
      return NextResponse.json(
        { error: 'Error al crear la respuesta' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      answer: {
        id: answer.id,
        answerText: answer.answer_text,
        isInstructorAnswer: answer.is_instructor_answer,
        isAccepted: answer.is_accepted,
        upvotes: answer.upvotes,
        createdAt: answer.created_at,
        author: {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          avatarUrl: user.user_metadata?.avatar_url,
          role: dbUser.role,
        },
      },
    }, { status: 201 });

  } catch (e: any) {
    console.error('[questions/answer API] Error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/student/questions/answer - Marcar respuesta como aceptada
 * Body: { answerId, questionId }
 *
 * SEGURIDAD:
 * - Autenticación requerida
 * - Solo el autor de la pregunta puede aceptar respuestas
 * - Rate limiting aplicado
 */
export async function PATCH(req: NextRequest) {
  try {
    // 1. Autenticación
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Rate limiting
    const rateLimitResponse = rateLimitMiddleware(
      req,
      RATE_LIMITS.VOTING,
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Validar body
    const parseResult = await parseRequestBody(req, acceptAnswerSchema);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const { answer_id, question_id } = parseResult.data;

    // 4. Obtener student_id del usuario autenticado
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // 5. Verificar que el usuario es el autor de la pregunta
    const { data: question, error: questionError } = await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .select('id, student_id')
      .eq('id', question_id)
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

    // 6. Desmarcar otras respuestas aceptadas de esta pregunta
    await supabase
      .from(TABLES.LESSON_QUESTION_ANSWERS)
      .update({ is_accepted: false })
      .eq('question_id', question_id);

    // 7. Marcar la respuesta como aceptada
    const { data: answer, error: updateError } = await supabase
      .from(TABLES.LESSON_QUESTION_ANSWERS)
      .update({ is_accepted: true })
      .eq('id', answer_id)
      .select(`
        id,
        answer_text,
        is_instructor_answer,
        is_accepted,
        upvotes,
        created_at
      `)
      .single();

    if (updateError) {
      console.error('[questions/answer API] Error updating answer:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar la respuesta' },
        { status: 500 }
      );
    }

    // 8. Marcar la pregunta como resuelta
    await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .update({ is_resolved: true })
      .eq('id', question_id);

    return NextResponse.json({
      answer: {
        id: answer.id,
        answerText: answer.answer_text,
        isInstructorAnswer: answer.is_instructor_answer,
        isAccepted: answer.is_accepted,
        upvotes: answer.upvotes,
        createdAt: answer.created_at,
      },
      resolved: true,
    }, { status: 200 });

  } catch (e: any) {
    console.error('[questions/answer API] Error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
