import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TABLES } from '@/utils/constants';
import {
  createQuestionSchema,
  updateQuestionSchema,
  listQuestionsQuerySchema,
  parseRequestBody,
  parseQueryParams,
} from '@/lib/validators/lessonContentSchema';
import {
  rateLimitMiddleware,
  RATE_LIMITS,
} from '@/lib/auth/serverRateLimiter';

/**
 * GET /api/student/questions - Obtener preguntas de una lección
 * Query params: lessonId, sortBy (recent | popular | unanswered), limit, offset
 *
 * SEGURIDAD:
 * - Autenticación requerida via session
 * - Rate limiting aplicado
 * - Validación de inputs con Zod
 * - RLS maneja permisos automáticamente
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResponse = rateLimitMiddleware(req, RATE_LIMITS.READ);
    if (rateLimitResponse) return rateLimitResponse;

    // 2. Autenticación
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 3. Validar query params
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId es requerido' },
        { status: 400 }
      );
    }

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lessonId)) {
      return NextResponse.json({ questions: [] }, { status: 200 });
    }

    // Parsear opciones de query
    const queryResult = parseQueryParams(req, listQuestionsQuerySchema);
    const parsedOptions = queryResult.success ? queryResult.data : {};
    const queryOptions = {
      sort: parsedOptions.sort ?? 'recent' as const,
      limit: parsedOptions.limit ?? 50,
      offset: parsedOptions.offset ?? 0,
      unresolved_only: parsedOptions.unresolved_only ?? false,
    };

    // 4. Obtener preguntas CON respuestas para compatibilidad con código existente
    let query = supabase
      .from(TABLES.LESSON_QUESTIONS)
      .select(`
        id,
        question_text,
        video_timestamp,
        is_resolved,
        upvotes,
        answer_count,
        created_at,
        student:students!lesson_questions_student_id_fkey (
          id,
          user:users!students_user_id_fkey (
            id,
            name,
            last_name,
            avatar_url
          )
        ),
        answers:lesson_question_answers (
          id,
          answer_text,
          is_instructor_answer,
          is_accepted,
          upvotes,
          created_at,
          user:users!lesson_question_answers_user_id_fkey (
            id,
            name,
            last_name,
            avatar_url,
            role
          )
        )
      `)
      .eq('lesson_id', lessonId);

    // Filtro opcional por no resueltas
    if (queryOptions.unresolved_only) {
      query = query.eq('is_resolved', false);
    }

    // Ordenamiento
    switch (queryOptions.sort) {
      case 'popular':
        query = query.order('upvotes', { ascending: false });
        break;
      case 'unanswered':
        query = query.order('answer_count', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Paginación
    query = query.range(queryOptions.offset, queryOptions.offset + queryOptions.limit - 1);

    const { data: questions, error: questionsError } = await query;

    if (questionsError) {
      console.error('[questions API] Error fetching questions:', questionsError);
      return NextResponse.json(
        { error: 'Error al obtener preguntas' },
        { status: 500 }
      );
    }

    // 5. Formatear respuesta (compatible con código existente)
    const formattedQuestions = (questions || []).map((q: any) => {
      // Ordenar respuestas: instructor primero, luego aceptadas, luego por upvotes
      const sortedAnswers = (q.answers || [])
        .map((a: any) => ({
          id: a.id,
          answerText: a.answer_text,
          isInstructorAnswer: a.is_instructor_answer,
          isAccepted: a.is_accepted,
          upvotes: a.upvotes,
          createdAt: a.created_at,
          author: a.user ? {
            id: a.user.id,
            name: `${a.user.name} ${a.user.last_name || ''}`.trim(),
            avatarUrl: a.user.avatar_url,
            role: a.user.role,
          } : null,
        }))
        .sort((a: any, b: any) => {
          if (a.isInstructorAnswer && !b.isInstructorAnswer) return -1;
          if (!a.isInstructorAnswer && b.isInstructorAnswer) return 1;
          if (a.isAccepted && !b.isAccepted) return -1;
          if (!a.isAccepted && b.isAccepted) return 1;
          return b.upvotes - a.upvotes;
        });

      return {
        id: q.id,
        questionText: q.question_text,
        videoTimestamp: q.video_timestamp,
        isResolved: q.is_resolved,
        upvotes: q.upvotes,
        answersCount: q.answer_count || sortedAnswers.length,
        createdAt: q.created_at,
        author: q.student?.user ? {
          id: q.student.user.id,
          name: `${q.student.user.name} ${q.student.user.last_name || ''}`.trim(),
          avatarUrl: q.student.user.avatar_url,
        } : null,
        answers: sortedAnswers, // Incluir respuestas para compatibilidad
      };
    });

    return NextResponse.json({
      questions: formattedQuestions,
      pagination: {
        offset: queryOptions.offset,
        limit: queryOptions.limit,
        hasMore: formattedQuestions.length === queryOptions.limit,
      },
    }, { status: 200 });

  } catch (e: any) {
    console.error('[questions API] Error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/questions - Crear una nueva pregunta
 * Body: { lessonId, courseId, questionText, videoTimestamp? }
 *
 * SEGURIDAD:
 * - Autenticación requerida via session (NO confía en userId del cliente)
 * - Rate limiting estricto para creación de contenido
 * - Validación y sanitización con Zod
 * - RLS maneja permisos automáticamente
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticación PRIMERO (para rate limit por usuario)
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

    // 3. Validar body con Zod (incluye sanitización XSS)
    const parseResult = await parseRequestBody(req, createQuestionSchema);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const { question_text, video_timestamp, course_id } = parseResult.data;

    // 4. Obtener lessonId de query params o body
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId') || parseResult.data.lesson_id;

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId es requerido' },
        { status: 400 }
      );
    }

    // 5. Obtener student_id del usuario autenticado
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

    // 6. Verificar que el estudiante está inscrito en el curso
    const { data: enrollment, error: enrollmentError } = await supabase
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('id')
      .eq('student_id', student.id)
      .eq('course_id', course_id)
      .maybeSingle();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'No estás inscrito en este curso' },
        { status: 403 }
      );
    }

    // 7. Crear la pregunta
    const { data: question, error: questionError } = await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .insert({
        student_id: student.id,
        lesson_id: lessonId,
        course_id: course_id,
        question_text: question_text, // Ya sanitizado por Zod
        video_timestamp: video_timestamp,
      })
      .select(`
        id,
        question_text,
        video_timestamp,
        is_resolved,
        upvotes,
        answer_count,
        created_at
      `)
      .single();

    if (questionError) {
      console.error('[questions API] Error creating question:', questionError);
      return NextResponse.json(
        { error: 'Error al crear la pregunta' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      question: {
        id: question.id,
        questionText: question.question_text,
        videoTimestamp: question.video_timestamp,
        isResolved: question.is_resolved,
        upvotes: question.upvotes,
        answersCount: question.answer_count || 0,
        createdAt: question.created_at,
        author: {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          avatarUrl: user.user_metadata?.avatar_url,
        },
      },
    }, { status: 201 });

  } catch (e: any) {
    console.error('[questions API] Error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/student/questions - Eliminar una pregunta
 * Query params: questionId
 *
 * SEGURIDAD:
 * - Autenticación requerida via session
 * - Verifica que la pregunta pertenece al estudiante autenticado
 * - Solo se puede eliminar si no tiene respuestas
 */
export async function DELETE(req: NextRequest) {
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
      RATE_LIMITS.CONTENT_CREATE,
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Validar questionId
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json(
        { error: 'questionId es requerido' },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(questionId)) {
      return NextResponse.json(
        { error: 'questionId inválido' },
        { status: 400 }
      );
    }

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

    // 5. Verificar que la pregunta pertenece al estudiante y no tiene respuestas
    const { data: question, error: questionCheckError } = await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .select('id, student_id, answer_count')
      .eq('id', questionId)
      .single();

    if (questionCheckError || !question) {
      return NextResponse.json(
        { error: 'Pregunta no encontrada' },
        { status: 404 }
      );
    }

    if (question.student_id !== student.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta pregunta' },
        { status: 403 }
      );
    }

    if (question.answer_count > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una pregunta que tiene respuestas' },
        { status: 400 }
      );
    }

    // 6. Eliminar la pregunta
    const { error: deleteError } = await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .delete()
      .eq('id', questionId)
      .eq('student_id', student.id);

    if (deleteError) {
      console.error('[questions API] Error deleting question:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar la pregunta' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (e: any) {
    console.error('[questions API] Error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/student/questions - Actualizar una pregunta
 * Body: { questionId, questionText }
 *
 * SEGURIDAD:
 * - Autenticación requerida via session
 * - Verifica que la pregunta pertenece al estudiante autenticado
 * - Solo se puede editar si no tiene respuestas
 * - Validación y sanitización con Zod
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
      RATE_LIMITS.CONTENT_CREATE,
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Parsear y validar body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Body JSON inválido' },
        { status: 400 }
      );
    }

    const { questionId } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: 'questionId es requerido' },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(questionId)) {
      return NextResponse.json(
        { error: 'questionId inválido' },
        { status: 400 }
      );
    }

    // Validar contenido con Zod
    const parseResult = updateQuestionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { question_text, video_timestamp } = parseResult.data;

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

    // 5. Verificar que la pregunta pertenece al estudiante y no tiene respuestas
    const { data: existingQuestion, error: questionCheckError } = await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .select('id, student_id, answer_count')
      .eq('id', questionId)
      .single();

    if (questionCheckError || !existingQuestion) {
      return NextResponse.json(
        { error: 'Pregunta no encontrada' },
        { status: 404 }
      );
    }

    if (existingQuestion.student_id !== student.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para editar esta pregunta' },
        { status: 403 }
      );
    }

    if (existingQuestion.answer_count > 0) {
      return NextResponse.json(
        { error: 'No se puede editar una pregunta que tiene respuestas' },
        { status: 400 }
      );
    }

    // 6. Actualizar la pregunta
    const updateData: Record<string, unknown> = {};
    if (question_text !== undefined) updateData.question_text = question_text;
    if (video_timestamp !== undefined) updateData.video_timestamp = video_timestamp;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nada que actualizar' },
        { status: 400 }
      );
    }

    const { data: question, error: updateError } = await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .update(updateData)
      .eq('id', questionId)
      .eq('student_id', student.id)
      .select(`
        id,
        question_text,
        video_timestamp,
        is_resolved,
        upvotes,
        answer_count,
        created_at
      `)
      .single();

    if (updateError) {
      console.error('[questions API] Error updating question:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar la pregunta' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      question: {
        id: question.id,
        questionText: question.question_text,
        videoTimestamp: question.video_timestamp,
        isResolved: question.is_resolved,
        upvotes: question.upvotes,
        answersCount: question.answer_count || 0,
        createdAt: question.created_at,
        author: {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          avatarUrl: user.user_metadata?.avatar_url,
        },
      },
    }, { status: 200 });

  } catch (e: any) {
    console.error('[questions API] Error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
